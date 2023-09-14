
import React, { useState, useEffect } from "react";
import { Row, Empty, Menu, Icon, Input, Spin, Button, Typography } from "antd";
const { SubMenu } = Menu;
import { GetPropertyValuesMultiple } from '@/components/queries';
import { runNeoApi } from "../callNeoApi";

export const MenuKeys = {
    MovieYears: "movieyears_menu",
    Genres: "genres_menu"
}

const IconMap = {
    MovieYears: "team",
    Genres: "appstore"
}

const getMenus = ({ userChecks, setUserChecks, searchCriteria, setSearchCriteria,
    coldStart, setColdStart, menuFilters, setMenuFilters, facetCounts }) =>
    ({ setSearchCriteria, movieYears, genres }) => {
        var subMenus = [];
        console.log('movieYears: ', movieYears);
        console.log('genres: ', genres);
        const subMenu = getSubMenu({
            userChecks, setUserChecks, searchCriteria, setSearchCriteria,
            coldStart, setColdStart, menuFilters, setMenuFilters, facetCounts
        });
        subMenus.push(subMenu(MenuKeys.MovieYears, "Movie Years", IconMap.MovieYears, movieYears));
        subMenus.push(subMenu(MenuKeys.Genres, "Genres", IconMap.Genres, genres));
        return subMenus;
}

const getSubMenu = ({ userChecks, setUserChecks, searchCriteria, setSearchCriteria,
    coldStart, setColdStart, menuFilters, setMenuFilters, facetCounts }) =>
    (key, titleText, iconName, values) => {
        const handler = clickHandler({ userChecks, setUserChecks, searchCriteria, setSearchCriteria, coldStart, setColdStart });
        return (
            <SubMenu
                key={key}
                title={
                    <span>
                        <Icon type={iconName} />
                        <span>{titleText}</span>
                    </span>
                }
            >
                <Input style={{ marginLeft: '24px', width: '200px', marginBottom: "8px" }} placeholder="filter list" allowClear
                    onChange={(e) => updateMenuFilters({ key, value: e.target.value, menuFilters, setMenuFilters })}
                />
                {
                    getMenuItems({ values, menuFilters, userChecks, key, handler, coldStart, facetCounts })
                }
            </SubMenu>
        )
}

const getMenuItemKey = (menuKey, value) => {
    console.log("value: ", value);
    let strValue = '' + value.value;
    const itemKey = `${menuKey}_${strValue.replace(/ /g, '_')}`;
    return itemKey;
}

const getMenuItems = ({ values, menuFilters, userChecks, key, handler, coldStart, facetCounts }) => {
    var filteredValues = values
        .filter(value => {
            const filterText = menuFilters[key];
            if (!filterText) {
                return true;
            } else {
                let strValue = '' + value.value;
                const match = strValue.match(new RegExp(filterText, "i"))
                return (match) ? true : false;
            }

        })

    var menuItems = filteredValues.map(value => {
        const itemKey = getMenuItemKey(key, value);
        const isChecked = userChecks[itemKey];
        const facetCount = (coldStart) ? 0 : getFacetCount(facetCounts, value);
        const facetString = (facetCount) ? ` (${facetCount})` : '';
        const displayText = `${value.value}${facetString}`;

        const menuItemStyle = {
            minHeight: "30px",
            height: "auto",
            lineHeight: "normal",
            listStylePosition: "inside",
            listStyleType: "disc",
            whiteSpace: "normal",
            borderBottom: "1px dotted #E0E0E0",
            alignItems: "center",
            display: "flex",
            paddingBottom: "8px",
        };

        return (
            <Menu.Item
                style={menuItemStyle}
                key={itemKey}
                onClick={handler({ itemKey, value })}
            >
                <span title={displayText}>
                    {isChecked ? <Icon type="check" /> : <></>}
                    <span>{displayText}</span>
                </span>
            </Menu.Item>
        )
    })
    return menuItems;
}

const getFacetCount = (facetCounts, value) => {
    var key = '';
    switch (value.label) {
        case 'MovieYears':
            key = 'movieYears';
            break;
        case 'Genres':
            key = 'genres';
        default:
            break;
    }
    const facetMap = facetCounts[key] || {};
    const count = facetMap[value.value];
    return count;
}

const clickHandler = ({ userChecks, setUserChecks, searchCriteria, setSearchCriteria, coldStart, setColdStart }) =>
    ({ itemKey, value }) => () => {
        const newChecks = { ...userChecks }
        if (userChecks[itemKey]) {
            delete newChecks[itemKey];
            removeFromSearchCriteria({ searchCriteria, setSearchCriteria, value })
        } else {
            addToSearchCriteria({ searchCriteria, setSearchCriteria, coldStart, setColdStart, value })
            newChecks[itemKey] = true;
        }
        setUserChecks(newChecks);
}

const getValues = (propertyValuesEntry) => {
    const labelAndProp = {
        label: propertyValuesEntry.label,
        property: propertyValuesEntry.property
    };

    const values = propertyValuesEntry.values.map(x => ({
        ...labelAndProp,
        value: x
    }));
    return values;
}

const updateMenuFilters = ({ key, value, menuFilters, setMenuFilters }) => {
    const newMenuFilters = { ...menuFilters };
    if (value) {
        newMenuFilters[key] = value;
    } else {
        delete newMenuFilters[key];
    }
    setMenuFilters(newMenuFilters);
}

const handleReset = () => {
    let newUserChecks = {}
    setSearchCriteria({
        selectedStringItems: []
    })
    setUserChecks(newUserChecks)
    setColdStart(false)

};

const Facets = (props) => {

    const { 
        searchCriteria, setSearchCriteria, 
        coldStart, setColdStart, 
        facetCounts, setFacetCounts,
        userChecks, setUserChecks
    } = props;

    const [data, setData] = useState();
    const [loading, setLoading] = useState();
    const [error, setError] = useState();

    const [menuFilters, setMenuFilters] = useState({});

    const [movieYears, setMovieYears] = useState([]);
    const [genres, setGenres] = useState([]);

    useEffect(() => {
        let getInitialFacets = async () => {
            let data = await runNeoApi(GetPropertyValuesMultiple, {
                listsToFetch: [
                    { label: "Movie", property: "year" },
                    { label: "Genre", property: "name" }
                ]
            }, {});
            setLoading(false);
            setData(data);

            console.log(data);
            if (data && data.result) {
                data.result.forEach(resultItem => {
                    let x = resultItem.response;
                    if (x.label === 'Movie' && x.property === 'year') {
                        setMovieYears(getValues(x));
                    } else if (x.label === 'Genre' && x.property === 'name') {
                        setGenres(getValues(x));
                    }
                })
            }
        }
        getInitialFacets();
    }, [])

    if (loading) {
        return (
            <Row
                type="flex"
                justify="center"
                style={{ height: "calc(100vh - 240px)", alignItems: "center" }}
            >
                <Spin size="large" />
            </Row>
        );
    }

    if (error) {
        return (
            <Row
                type="flex"
                justify="center"
                style={{ height: "calc(100vh - 240px)", alignItems: "center" }}
            >
                <Empty />
            </Row>
        );
    }

    if (data) {
        const menu = getMenus({
            userChecks, setUserChecks,
            searchCriteria, setSearchCriteria,
            coldStart, setColdStart,
            menuFilters, setMenuFilters,
            facetCounts
        });

        return (
            <div style={{
                overflowY: 'scroll',
                height: 'calc(100vh - 20px)',
                minWidth: '270px'
            }}>
                <Button onClick={() => handleReset()} size="small" style={{ width: 50, alignItems: "center", height: "50" }}>Reset</Button>
                <Menu
                    style={{ width: 270 }}
                    mode={'inline'}
                >
                    {
                        menu({ setSearchCriteria, movieYears, genres })
                    }
                </Menu>
            </div>
        )
    }
}

export default Facets;     