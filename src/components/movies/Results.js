import React, { useState, useEffect } from "react";
import { Col, Row, Empty, Icon, List, Select, Spin, Tag, Typography, Tooltip, Button, Avatar } from "antd";
import { runNeoApi } from "../callNeoApi";
import { SearchWithFacets } from '@/components/queries';

const { Text, Paragraph } = Typography;
const { Option } = Select;

const Results = ({ searchCriteria, setSearchCriteria, 
    userChecks, setUserChecks,
    coldStart, setFacetCounts
}) => {

    const [data, setData] = useState();
    const [loading, setLoading] = useState();
    const [error, setError] = useState();
    const [movies, setMovies] = useState([]);

    useEffect(() => {
        let getInitialResults = async () => {
            let data = await runNeoApi(SearchWithFacets, {
                listsToFetch: [
                    { label: "Movie", property: "year" },
                    { label: "Genre", property: "name" }
                ]
            }, {
                searchCriteria: searchCriteria
            });
            setLoading(false);
            setData(data);

            console.log(data);
            if (data && data.result) {

                if (data.result.movies) {
                    setMovies(data.result.movies);
                }
                if (data.result.facets) {
                    setFacetCounts(data.result.facets);
                }
            }
        }
        getInitialResults();
    }, [])

    const spinEmptyStyle = {
        width: "calc(100vw - 600px)",
        height: "calc(100vh - 240px)",
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
                style={spinEmptyStyle}
            >
                <Empty />
            </Row>
        );

    return (
        <div style={{
            marginLeft: '10px',
        }}>
            <Row type="flex">
                <Col>
                    {coldStart ? null :
                        <span style={{ marginRight: '10px' }}>Number of results: {movies.length}</span>
                    }
                </Col>
            </Row>
            <div style={{
                maxWidth: "calc(100vw - 600px)",
                maxHeight: "calc(100vh - 190px)",
                overflowY: "scroll"
            }}>
                <List
                    dataSource={movies ? movies : []}
                    style={{ width: "100%" }}
                    renderItem={(item) => (
                        <List.Item
                            style={{ cursor: "pointer" }}
                        >
                            <List.Item.Meta
                                style={{
                                    width: "100%"
                                }}
                                title={
                                    <>
                                        <Paragraph>
                                            <div style={{ display: 'flex' }}>
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <Text style={{ marginRight: '10px' }} strong>
                                                        {item.title}
                                                    </Text>
                                                </div>
                                            </div>
                                        </Paragraph>
                                        <Row type="flex" flexwrap="wrap" flex="1">
                                            <Col>{item.year}</Col>
                                            <Col>{item.imdbRating}</Col>
                                        </Row>
                                    </>
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