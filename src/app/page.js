'use client';

import { Button } from 'antd';
import { runNeoApi } from '@/components/callNeoApi';
import { GetPropertyValuesMultiple } from '@/components/queries';
import Movies from '@/components/movies/Movies';

export default function Home() {

  const handleClick = async () => {
    /*
    let cypher = `
      MATCH (m:Movie) RETURN count(m) as movieCount
    `
    let response = await runNeoApi(cypher, {}, {});
    console.log('response: ', response);

    response = await runNeoApi(GetPropertyValuesMultiple, {
      listsToFetch: [
        { label: "Movie", property: "year" },
        { label: "Genre", property: "name" }
      ]
    }, {});
    console.log('response: ', response);
    */
  }

  return (
    <div className="App">
      {/*<Button onClick={handleClick} type="primary">Button</Button>*/}
      <Movies/>
    </div>
  )
}
