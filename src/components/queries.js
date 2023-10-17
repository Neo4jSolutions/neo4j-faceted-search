
export const GetPropertyValuesMultiple = `
	WITH $listsToFetch as listsToFetch, {
	cypher: "
		MATCH (n:$$label)
		RETURN distinct(n.$$property) as value
		ORDER BY value
	"
	} as params
	UNWIND listsToFetch as listToFetch
	WITH listToFetch, reduce(
		newCypher = params.cypher, 
		x IN ["label","property"] 
	|
		replace(newCypher, '$$' + x, listToFetch[x])
	) as newCypher
	CALL apoc.cypher.run(newCypher, {}) YIELD value
	WITH listToFetch, collect(value.value) as values
	RETURN {
		label: listToFetch.label, 
		property: listToFetch.property, 
		values: values
	} as response
`;

export const SearchWithFacets = `
WITH $searchCriteria as searchCriteria,
{
    Movie: {
		props: ["year", "revenue", "runtime","imdbRating" ,"languages","noProperty"],
		match: "(movie:Movie)",
		where: {
			year: "
			   any(x IN searchCriteria.yearRanges WHERE 
				  x.low <= toFloat(movie.year) < x.high
			   )
			",
			revenue: "
			   any(x IN searchCriteria.revenueRanges WHERE 
				  x.low <= toFloat(movie.revenue) < x.high
			   )
			",
			runtime: "
			   any(x IN searchCriteria.runtimeRanges WHERE 
				  x.low <= toFloat(movie.runtime) < x.high
			   )
			",
         imdbRating: "
			   any(x IN searchCriteria.imdbRanges WHERE 
				  x.low <= toFloat(movie.runtime) < x.high
			   )
			",
			noProperty: ""
		 }
   
    },
    Genre: {
		props: ["name"],
		match: "(movie:Movie)-[:IN_GENRE]->(genre:Genre)",
		variable: "genre"
    },
    Actor: {
		props: ["name"],
		match: "(movie:Movie)<-[:ACTED_IN]-(actor:Person)",
		variable: "actor"
    },
    Director: {
		props: ["name"],
		match: "(movie:Movie)<-[:DIRECTED]-(director:Person)",
		variable: "director"
    }
} as cypherModel

WITH cypherModel, {
   selectedStringItems: coalesce(searchCriteria.selectedStringItems, []),
   revenueRanges: coalesce(searchCriteria.revenueRanges, []),
   runtimeRanges: coalesce(searchCriteria.runtimeRanges, []),
   yearRanges: coalesce(searchCriteria.yearRanges, []),
   imdbRanges: coalesce(searchCriteria.imdbRanges, []),
   keywords: coalesce(searchCriteria.keywords, "")
} as searchCriteria

WITH cypherModel, searchCriteria, 
  apoc.map.fromPairs([x IN searchCriteria.selectedStringItems | [x.label + '_' + x.property, x.values]]) as searchCriteriaMap

WITH cypherModel, searchCriteria, searchCriteriaMap

// handle keywords
CALL apoc.when(size(searchCriteria.keywords) > 0,
   "
   CALL db.index.fulltext.queryNodes('moviesFullText', keywords) YIELD node
   WITH CASE 
   	  WHEN apoc.label.exists(node, 'Person') THEN [(node)<-[:ACTED_IN|DIRECTED]-(person:Person) | node]
	  WHEN apoc.label.exists(node, 'Genre') THEN [(node)<-[:HAS_GENRE]-(genre:Genre) | node]
      ELSE node				// assumed to be Movie
   END as movie
   WITH apoc.coll.flatten(collect(movie)) as matches
   WITH 'id(movie) IN [' + apoc.text.join([x IN apoc.coll.toSet(matches) | '' + id(x)], ',') + ']' as whereSnippet
   RETURN whereSnippet
   ",
   "
   RETURN '' as whereSnippet
   ",
   { keywords: searchCriteria.keywords }
) YIELD value
WITH cypherModel, searchCriteria, searchCriteriaMap,
   value.whereSnippet as keywordWhereSnippet

// handle ranges - revenue, year, runtime
WITH cypherModel, searchCriteria, searchCriteriaMap, keywordWhereSnippet, 
   reduce(searchItems = searchCriteria.selectedStringItems, 
		x IN [
			{searchKey: "revenueRanges", propKey: "revenue"},
			{searchKey: "yearRanges", propKey: "year"},
			{searchKey: "runtimeRanges", propKey: "runtime"},
            {searchKey: "imdbRanges", propKey: "imdbRating"}
		] 
		|
		CASE WHEN size(searchCriteria[x.searchKey]) > 0 
			THEN searchItems + [{ label: "Movie", property: x.propKey }]
			ELSE searchItems
		END
   ) as searchItems

WITH cypherModel, searchCriteria, searchCriteriaMap, keywordWhereSnippet,
   CASE WHEN size(searchItems) > 0 THEN searchItems ELSE [{ label: "Movie", property: "noProperty" }] END as searchItems

// handle searchItems
UNWIND searchItems as item

WITH searchCriteria, searchCriteriaMap, cypherModel, keywordWhereSnippet, item, 
								coalesce(cypherModel[item.label], {}) as labelConfig

CALL apoc.util.validate(NOT(item.property IN labelConfig.props)
, "Search property '" + item.property + "' is not in label config '" + item.label + "'", [0])

WITH searchCriteria, searchCriteriaMap, cypherModel, keywordWhereSnippet, item, 
   labelConfig.match as matchSnippet, 
   CASE WHEN labelConfig.where IS NULL
     //THEN labelConfig.variable + "." + item.property + " IN [" + apoc.text.join([x IN item.values | '"' + x + '"'], ', ') + "]" 
     THEN labelConfig.variable + "." + item.property + " IN searchCriteriaMap." + item.label + "_" + item.property
     ELSE labelConfig.where[item.property]
   END as whereSnippet

WITH searchCriteria, searchCriteriaMap, 
   collect(distinct matchSnippet) as matchSnippets, 
   collect(distinct whereSnippet)  as whereCollectSnippets, [keywordWhereSnippet] as keywordWhereSnippets

WITH searchCriteria, searchCriteriaMap, 
   matchSnippets, whereCollectSnippets + keywordWhereSnippets as whereSnippets

WITH searchCriteria, searchCriteriaMap, matchSnippets, 
   [x IN whereSnippets WHERE x <> "" | x] as whereSnippets

// assemble query and execute
WITH searchCriteria, searchCriteriaMap, 
   "MATCH " + apoc.text.join(matchSnippets, "\n MATCH ") 
   + CASE WHEN size(whereSnippets) > 0 THEN "\nWHERE " + apoc.text.join(whereSnippets, "\n AND ") ELSE "" END
   + "\nRETURN movie" 
   as cypher 

CALL apoc.cypher.run(cypher, { searchCriteriaMap: searchCriteriaMap, searchCriteria: searchCriteria }) YIELD value
WITH distinct(value.movie) as movie
LIMIT 100
WITH apoc.map.merge(properties(movie), {
   nodeId: id(movie),
   genres: [(movie)-[:IN_GENRE]->(genre:Genre) | properties(genre)],
   directors: [(movie)-[:DIRECTED]->(director:Person)| properties(director)]
}) as movie ORDER BY movie.title

WITH collect(movie) as movies, 
  collect(toFloat(movie.revenue)) as revenues,
  collect(toFloat(movie.year)) as years,
  collect(toFloat(movie.imdbRating)) as imdbRatings,
  collect(toFloat(movie.runtime)) as runtimes,
  [x IN apoc.coll.flatten(collect(movie.genres)) | x.name] as genres,
  [x IN apoc.coll.flatten(collect(movie.directors)) | x.name] as directors

WITH movies,
apoc.coll.frequenciesAsMap([x IN imdbRatings |
   CASE 
      WHEN 1 <= x < 11 THEN "1+"
      WHEN 2 <= x < 11 THEN "2+"
      WHEN 3 <= x < 11 THEN "3+"
      WHEN 4 <= x < 11 THEN "4+"
      WHEN 5 <= x < 11 THEN "5+"
      WHEN 6 <= x < 11 THEN "6+"
      WHEN 7 <= x < 11 THEN "7+"
      WHEN 8 <= x < 11 THEN "8+"
      WHEN 9 <= x < 11 THEN "9+"
   END 
]) as imdbBucket,
   apoc.coll.frequenciesAsMap([x IN revenues |
      CASE 
         WHEN 0 <= x < 50000000 THEN "0-50M"
         WHEN 50000000 <= x < 100000000 THEN "50-100M"
         WHEN 100000000 <= x < 250000000 THEN "100-250M"
         WHEN 250000000 <= x < 500000000 THEN "250-500M"
         WHEN 500000000 <= x < 1000000000 THEN "500M-1B"
         WHEN 1000000000 <= x THEN "> 1B"
      END 
   ]) as revenueBucket,
   
   apoc.coll.frequenciesAsMap([x IN runtimes |
      CASE 
         WHEN 0 <= x < 60 THEN "<1 hour" 
         WHEN 60 <= x < 180 THEN "1-3 hour" 
         WHEN 180 <= x < 360 THEN "3-6 hour"
         WHEN 360 <= x < 1000000 THEN ">6 hour"
      END 
   ]) as runtimeBucket,
   apoc.coll.frequenciesAsMap([x IN years |
      CASE 
         WHEN 1900 <= x < 1910 THEN "1900s"
         WHEN 1910 <= x < 1920 THEN "1910s"
         WHEN 1920 <= x < 1930 THEN "1920s"
         WHEN 1930 <= x < 1940 THEN "1930s"
         WHEN 1940 <= x < 1950 THEN "1940s"
         WHEN 1950 <= x < 1960 THEN "1950s"
         WHEN 1960 <= x < 1970 THEN "1960s"
         WHEN 1970 <= x < 1980 THEN "1970s"
         WHEN 1980 <= x < 1990 THEN "1980s"
         WHEN 1990 <= x < 2000 THEN "1990s"
         WHEN 2000 <= x < 2010 THEN "2000s"
         WHEN 2010 <= x < 2020 THEN "2010s"
         WHEN 2020 <= x < 2030 THEN "2020s"
      END 
   ]) as yearBucket,
   apoc.coll.frequenciesAsMap(genres) as genres, 
   apoc.coll.frequenciesAsMap(directors) as directors  

RETURN {
    movies: movies,
    facets: {
      revenueBucket: revenueBucket,
      runtimeBucket:runtimeBucket,
      yearBucket:yearBucket,
      imdbBucket:imdbBucket,
		genres: genres,
		directors: directors
    }
} as response
`
