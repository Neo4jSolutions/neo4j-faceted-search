import React, { useState, useEffect } from "react";
import { Col, Row, Empty, Icon, List, Select, Spin, Tag, Typography, Tooltip, Button, Avatar } from "antd";
import { runNeoApi } from "../callNeoApi";
import { SearchWithFacets } from '@/components/queries';
import './../../app/globals.css'

const { Text, Paragraph } = Typography;
const { Option } = Select;

const Results = ({ searchCriteria, setSearchCriteria,
    userChecks, setUserChecks,
    coldStart, setFacetCounts
}) => {

    console.log("Results search", searchCriteria)

    const [data, setData] = useState();
    const [loading, setLoading] = useState();
    const [error, setError] = useState();
    const [movies, setMovies] = useState([]);

    console.log("newSearchCriteria : ", searchCriteria)

    useEffect(() => {
        console.log("query runs: ")
        let getInitialResults = async () => {
            let data = await runNeoApi(SearchWithFacets, {
                searchCriteria: searchCriteria
            }, {});

            setLoading(false);
            setData(data);

            console.log(data);
            if (data && data.result) {
                // console.log("Get inside result", data.result[0].response.movies)

                if (data.result[0].response.movies) {
                    setMovies(data.result[0].response.movies);
                }
                if (data.result[0].response.facets) {
                    setFacetCounts(data.result[0].response.facets);
                }
            }
        }
        getInitialResults();
    }, [searchCriteria])

    const spinEmptyStyle = {
        width: "calc(100vw - 600px)",
        height: "calc(100vh - 240px)",
        alignItems: "center"
    }

    const spinEmptyStyle2 = {
        width: "600px",
        height: "240px",
        alignItems: "center"
    }


    if (loading)
        return (
            <Row
                type="flex"
                justify="center"
                style={spinEmptyStyle}
            >
                <Spin size="large" />
            </Row>
        );
    if (error)
        return (
            <Row
                type="flex"
                justify="center"
                style={spinEmptyStyle2}
            >
                <Empty />
            </Row>
        );

    return (
        <div style={{
            marginLeft: '25px',
            width: "calc(100vw - 600px)",
            height: "calc(100vh - 240px)",
            alignItems: "center"
        }}>
            <Row type="flex">
                <Col>
                    {coldStart ? null :
                        <span style={{ marginRight: '25px' }}>Number of results: {movies.length}</span>
                    }
                </Col>
            </Row>
            <div style={{
                maxWidth: "calc(100vw - 600px)",
                maxHeight: "calc(100vh - 50px)",
                overflowY: "scroll"
            }}>
                <List
                    dataSource={movies ? movies : []}
                    style={{ width: "100%" }}
                    renderItem={(item) => (
                        <List.Item
                            style={{ cursor: "pointer", borderBottom: '1px solid gray' }}
                        >
                            <List.Item.Meta
                                style={{
                                    width: "100%"
                                }}
                                title={
                                    <div className="card-content">
                                        <div className="card-img-container">
                                            <img
                                                className="card-img"
                                                src={"//images.weserv.nl/?url=" + item.poster + "&w=120&h=120"}
                                                alt=""
                                                onClick={() => this.props.runRecommendationEngines(item)}
                                            />
                                        </div>
                                        <div className="card-text">
                                            <Paragraph>
                                                <Text strong>{item.title}</Text>
                                            </Paragraph>
                                            <Row type="flex" flexwrap="wrap" flex="1">
                                                <Col>{item.plot}</Col>
                                            </Row>
                                            <Row type="flex" flexwrap="wrap" flex="1">
                                                <Col>{item.year}, {item.runtime} minutes, {item.imdbRating} imdb rating</Col>
                                            </Row>
                                        </div>
                                    </div>
                                }
                                description={
                                    <div>
                                        <Paragraph>
                                            <Text>
                                                {item.description}
                                            </Text>
                                        </Paragraph>
                                    </div>

                                }
                            />
                        </List.Item>
                    )
                    }
                />
            </div >
        </div >
    )
}

export default Results; 