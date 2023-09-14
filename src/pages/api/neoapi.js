
import neo4j from "neo4j-driver";

let _driver = null;

const getDriver = () => {
    if (!_driver) {
        const uri = process.env.NEO4J_URI;
        const username = process.env.NEO4J_USERNAME;
        const password = process.env.NEO4J_PASSWORD; 
        _driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
            disableLosslessIntegers: true
        });
    }
    return _driver;
}

const runCypher = async (cypher, parameters, options) => {

    let driver = getDriver();
    const database = process.env.NEO4J_DATABASE;
    var session; 

    if (database) {
        session = driver.session({database: database});
    } else {
        session = driver.session();
    }
    
    let results = [];
    let runResult = null;
    await session.run(cypher, parameters, { timeout: 90000 })
      .then(result => {
        runResult = result;
        result.records.forEach((record, i) => {
          let oneRecord = {};
          record.keys.forEach(key => {
            oneRecord[key] = record.get(key);
          })
          results.push(oneRecord);
        })
    })
    await session.close();

    if (options && options.returnResultSummary) {
      return {
        summary: (runResult) ? runResult.summary : {},
        results: results
      }
    } else {
      return results;
    }
}


const handler = async (req, res) => {
    //console.log(req);
    let json = req.body;
    console.log('json: ', json);
    const { cypherQuery, parameters, options } = json;
    try {
      const result = await runCypher(cypherQuery, parameters, options);
      console.log("result: ", result);
      return res.status(200).json({ result })
    } catch (err) {
      console.log("err: ", err);
      return res.status(200).json({ error: err.toString() }, { status: 500 })
    } 
};

export default handler;