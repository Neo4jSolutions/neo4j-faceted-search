
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
		props: ["year", "revenue", "runtime", "languages"],
		match: "(movie:Movie)",
		where: {
			year: "
			   any(x IN searchCriteria.yearRanges WHERE 
				  x.low <= apoc.convert.toFloat(movie.year) < x.high
			   )
			",
			revenue: "
			   any(x IN searchCriteria.revenueRanges WHERE 
				  x.low <= apoc.convert.toFloat(movie.revenue) < x.high
			   )
			",
			runtime: "
			   any(x IN searchCriteria.runtimeRanges WHERE 
				  x.low <= apoc.convert.toFloat(movie.runtime) < x.high
			   )
			",
			noProperty: ""
		 }
   
    },
    Genre: {
		props: ["name"],
		match: "(movie:Movie)<-[:HAS_GENRE]-(genre:Genre)",
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
   collect(distinct whereSnippet) + [keywordWhereSnippet] as whereSnippets

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
LIMIT 300
WITH apoc.map.merge(properties(movie), {
   nodeId: id(movie),
   genres: [(movie)<-[:HAS_GENRE]->(genre:Genre) | properties(genre)],
   actors: [(movie)<-[:ACTED_IN]-(actor:Person) | properties(actor)],
   directors: [(movie)-[:DIRECTED]->(director:Person)| properties(director)]
}) as movie ORDER BY movie.title

WITH collect(movie) as movies, 
  collect(apoc.convert.toFloat(movie.revenue)) as revenues,
  [x IN apoc.coll.flatten(collect(movie.genres)) | x.name] as genres,
  [x IN apoc.coll.flatten(collect(movie.actors)) | x.name] as actors,
  [x IN apoc.coll.flatten(collect(movie.directors)) | x.name] as directors

WITH movies,
   apoc.coll.frequenciesAsMap([x IN revenues |
      CASE 
         WHEN 0 <= x < 50000000 THEN "0-50M"
         WHEN 50000000 <= x < 100000000 THEN "50-100M"
         WHEN 100000000 <= x < 250000000 THEN "100-250M"
         WHEN 250000000 <= x < 500000000 THEN "250-500M"
         WHEN 500000000 <= x < 1000000000 THEN "500M-1B"
         WHEN 1000000000 <= x THEN "> 1B"
      END 
   ]) as revenueBuckets,
   apoc.coll.frequenciesAsMap(genres) as genres, 
   apoc.coll.frequenciesAsMap(actors) as actors,   
   apoc.coll.frequenciesAsMap(directors) as directors,   

RETURN {
    movies: movies,
    facets: {
      	revenueBuckets: revenueBuckets,
		genres: genres,
		actors: actors,
		directors: directors
    }
} as response`
