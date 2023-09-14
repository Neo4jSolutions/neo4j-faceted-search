
export const runNeoApi = async (cypherQuery, parameters, options) => {
    let body = {
      cypherQuery: cypherQuery,
      parameters: parameters
    }
    if (options) {
      body.options = options;
    }
    const response = await fetch("/api/neoapi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("response: ", response)
    if (!response.ok) {
      throw new Error(response.statusText);
      //return { results: [{error: response.statusText}] }
    }

    const data = response.body;
    console.log("response.body: ", response.body)

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let responseText = ''
    
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      responseText += chunkValue;
    }
    let jsonResponse = JSON.parse(responseText);
    console.log('response: ', jsonResponse);
    
    return jsonResponse;
  }