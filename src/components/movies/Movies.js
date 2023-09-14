import React, { useState } from "react";
import Facets from "./Facets";
import Results from "./Results";

const Movies = (props) => {

    const [searchCriteria, setSearchCriteria] = useState({});
    const [coldStart, setColdStart] = useState(false);
    const [facetCounts, setFacetCounts] = useState({});
    const [userChecks, setUserChecks] = useState({});

    return (
        <div style={{ display: 'flex', flexFlow: 'row', marginTop: '10px', borderBottom: '1px dotted gray' }}>
            <Facets
                searchCriteria={searchCriteria} setSearchCriteria={setSearchCriteria}
                coldStart={coldStart} setColdStart={setColdStart}
                facetCounts={facetCounts} setFacetCounts={setFacetCounts}
                userChecks={userChecks} setUserChecks={setUserChecks}
            />
            <Results searchCriteria={searchCriteria} setSearchCriteria={setSearchCriteria}
                coldStart={coldStart}
                facetCounts={facetCounts} setFacetCounts={setFacetCounts}
                userChecks={userChecks} setUserChecks={setUserChecks}
            />
        </div>
    )
}

export default Movies;