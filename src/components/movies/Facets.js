
import React, { useState, useEffect } from "react";
import { Row, Empty, Icon, Menu, Input, Spin, Button, Typography } from "antd";
import {
    CheckOutlined,
    CalendarOutlined,
    AppstoreOutlined,
    DollarOutlined,
    FieldTimeOutlined,
    LikeOutlined,
    UserOutlined
} from '@ant-design/icons';
const { SubMenu } = Menu;
import { GetPropertyValuesMultiple } from '@/components/queries';
import { runNeoApi } from "../callNeoApi";

export const PresetMovieRatings = [
    { low: 0, high: 2, label: 'Movie', property: 'imdbRating', value: "Really Bad" },
    { low: 2, high: 4, label: 'Movie', property: 'imdbRating', value: "Not good" },
    { low: 4, high: 7, label: 'Movie', property: 'imdbRating', value: "Ok" },
    { low: 7, high: 9, label: 'Movie', property: 'imdbRating', value: "Good" },
    { low: 9, high: 10, label: 'Movie', property: 'imdbRating', value: "Excellent" }
];

export const PresetYearRanges = [
    { low: 1900, high: 1910, label: 'Movie', property: 'year', value: "1900s" },
    { low: 1910, high: 1920, label: 'Movie', property: 'year', value: "1910s" },
    { low: 1920, high: 1930, label: 'Movie', property: 'year', value: "1920s" },
    { low: 1930, high: 1940, label: 'Movie', property: 'year', value: "1930s" },
    { low: 1940, high: 1950, label: 'Movie', property: 'year', value: "1940s" },
    { low: 1950, high: 1960, label: 'Movie', property: 'year', value: "1950s" },
    { low: 1960, high: 1970, label: 'Movie', property: 'year', value: "1960s" },
    { low: 1970, high: 1980, label: 'Movie', property: 'year', value: "1970s" },
    { low: 1980, high: 1990, label: 'Movie', property: 'year', value: "1980s" },
    { low: 1990, high: 2000, label: 'Movie', property: 'year', value: "1990s" },
    { low: 2000, high: 2010, label: 'Movie', property: 'year', value: "2000s" },
    { low: 2010, high: 2020, label: 'Movie', property: 'year', value: "2010s" },
    { low: 2020, high: 2030, label: 'Movie', property: 'year', value: "2020s" },
];

export const PresetMovieRevenues = [
    { low: 0, high: 50000000, label: 'Movie', property: 'revenue', value: "0-50M" },
    { low: 50000000, high: 100000000, label: 'Movie', property: 'revenue', value: "50-100M" },
    { low: 100000000, high: 250000000, label: 'Movie', property: 'revenue', value: "100-250M" },
    { low: 250000000, high: 500000000, label: 'Movie', property: 'revenue', value: "250-500M" },
    { low: 500000000, high: 1000000000, label: 'Movie', property: 'revenue', value: "500M-1B" },
    { low: 1000000000, high: 3000000000, label: 'Movie', property: 'revenue', value: ">1B" }
];

export const PresetMovieRunTimes = [
    { low: 0, high: 60, label: 'Movie', property: 'runtime', value: "<1 hour" },
    { low: 60, high: 120, label: 'Movie', property: 'runtime', value: "1-2 hours" },
    { low: 120, high: 180, label: 'Movie', property: 'runtime', value: "2-3 hours" },
    { low: 180, high: 240, label: 'Movie', property: 'runtime', value: "3-4 hours" },
    { low: 240, high: 100000, label: 'Movie', property: 'runtime', value: ">4 hours" }
];

export const MenuKeys = {
    MovieYears: "movieyears_menu",
    Genres: "genres_menu",
    Revenues: "revenue_menu",
    Ratings: "ratings_menu",
    Runtimes: "runtime_menu",
    Directors: "directors_menu",

}

const IconMap = {
    MovieYears: <CalendarOutlined />,
    Genres: <AppstoreOutlined />,
    Revenues: <DollarOutlined />,
    Ratings: <LikeOutlined />,
    Runtimes: <FieldTimeOutlined />,
    Directors: <UserOutlined />,

}

const getMenus = ({ userChecks, setUserChecks, searchCriteria, setSearchCriteria,
    coldStart, setColdStart, menuFilters, setMenuFilters, facetCounts }) =>
    ({ setSearchCriteria, movieYears, genres, directors, revenues, ratings, runtimes }) => {
        var subMenus = [];
        const subMenu = getSubMenu({
            userChecks, setUserChecks, searchCriteria, setSearchCriteria,
            coldStart, setColdStart, menuFilters, setMenuFilters, facetCounts
        });
        subMenus.push(subMenu(MenuKeys.MovieYears, "Movie Years", IconMap.MovieYears, movieYears));
        subMenus.push(subMenu(MenuKeys.Genres, "Genres", IconMap.Genres, genres));
        subMenus.push(subMenu(MenuKeys.Ratings, "Ratings", IconMap.Ratings, ratings));
        subMenus.push(subMenu(MenuKeys.Revenues, "Revenues", IconMap.Revenues, revenues));
        subMenus.push(subMenu(MenuKeys.Runtimes, "Runtimes", IconMap.Runtimes, runtimes));
        //subMenus.push(subMenu(MenuKeys.Directors, "Directors", IconMap.Directors, directors));

        return subMenus;
    }

const clickHandler = ({ userChecks, setUserChecks, searchCriteria, setSearchCriteria, coldStart, setColdStart }) =>
    ({ itemKey, value }) => () => {
        console.log("userChecks", userChecks, "searchCriteria : ", searchCriteria, "itemKey :", itemKey, "value : ", value)
        const newChecks = { ...userChecks }
        if (userChecks[itemKey]) {
            console.log("Goes to removeFromSearchCriteria")
            delete newChecks[itemKey];
            removeFromSearchCriteria({ searchCriteria, setSearchCriteria, value })
        } else {
            console.log("Goes to addToSearchCriteria")
            addToSearchCriteria({ searchCriteria, setSearchCriteria, coldStart, setColdStart, value })
            newChecks[itemKey] = true;
        }
        setUserChecks(newChecks);
    }

export const addToSearchCriteria = ({ searchCriteria, setSearchCriteria, coldStart, setColdStart, value }) => {
    var newSearchCriteria = coldStart ? {} : { ...searchCriteria };
    setColdStart(false);

    if (value.label === 'Movie') {
        const rangeMap = {
            imdbRating: 'imdbRanges',
            revenue: 'revenueRanges',
            runtime: 'runtimeRanges',
            year: 'yearRanges'
        }
    
        const stringKey = rangeMap[value.property];
        var ranges = newSearchCriteria[stringKey] ? newSearchCriteria[stringKey].slice() : [];
        const index = ranges.findIndex(x => x.low === value.low && x.high === value.high);
        
        if (index === -1) {
            ranges.push({
                low: value.low,
                high: value.high
            })
            newSearchCriteria[stringKey] = ranges;
        }
    } else {
        var selectedStringItems = (newSearchCriteria.selectedStringItems) ? newSearchCriteria.selectedStringItems.slice() : [];
        var entryAdded = false;
        if (selectedStringItems && selectedStringItems.length > 0) {
            const index = selectedStringItems.findIndex(x => x.label === value.label && x.property === value.property);
            if (index >= 0) {
                //example: { "label": "Vertical", "property": "vertical", "values": ["Insurance", "Healthcare"] }
                const existingEntry = selectedStringItems[index];
                var newEntry = { label: existingEntry.label, property: existingEntry.property, values: existingEntry.values.slice() }
                if (!newEntry.values.includes(value.value)) {
                    newEntry.values.push(value.value)
                }
                entryAdded = true;
                selectedStringItems[index] = newEntry;
            }
        }
        if (!entryAdded) {
            selectedStringItems.push({ label: value.label, property: value.property, values: [value.value] });
        }
        newSearchCriteria.selectedStringItems = selectedStringItems;
    }
    console.log("newSearchCriteria : ", newSearchCriteria)
    setSearchCriteria(newSearchCriteria);
}

export const removeFromSearchCriteria = ({ searchCriteria, setSearchCriteria, value }) => {
    var newSearchCriteria = { ...searchCriteria };

    if (value.label === 'Movie') {
        const rangeMap = {
            imdbRating: 'imdbRanges',
            revenue: 'revenueRanges',
            runtime: 'runtimeRanges',
            year: 'yearRanges'
        }
    
        const stringKey = rangeMap[value.property];
        var ranges = newSearchCriteria[stringKey] ? newSearchCriteria[stringKey].slice() : [];
        const index = ranges.findIndex(x => x.low === value.low && x.high === value.high);
        
        if (index >= 0) {
            ranges.splice(index, 1);
            newSearchCriteria[stringKey] = ranges;
        }
    } else {
        var selectedStringItems = (newSearchCriteria.selectedStringItems) ? newSearchCriteria.selectedStringItems.slice() : [];
        if (selectedStringItems && selectedStringItems.length > 0) {
            const index = selectedStringItems.findIndex(x => x.label === value.label && x.property === value.property);
            if (index >= 0) {
                //example: { "label": "Vertical", "property": "vertical", "values": ["Insurance", "Healthcare"] }
                const existingEntry = selectedStringItems[index];
                var newEntry = { label: existingEntry.label, property: existingEntry.property, values: existingEntry.values.slice() }
                const valueIndex = newEntry.values.findIndex(x => x === value.value);
                if (valueIndex >= 0) {
                    newEntry.values.splice(valueIndex, 1);
                }
                if (newEntry.values.length === 0) {
                    selectedStringItems.splice(index, 1);
                } else {
                    selectedStringItems[index] = newEntry;
                }
            }
        }
        if (selectedStringItems.length === 0) {
            delete newSearchCriteria.selectedStringItems;
        } else {
            newSearchCriteria.selectedStringItems = selectedStringItems;
        }
    }
    setSearchCriteria(newSearchCriteria);
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

const getFacetCount = (facetCounts, value) => {

    var key = '';
    switch (value.label) {
        case 'Movie':
            key = value.property + 'Bucket';
            break;
        case 'Genre':
            key = 'genres';
            break;
        case 'Director':
            key = 'directors';
            break;
        default:
            break;
    }
    const facetMap = facetCounts[key] || {};
    const count = facetMap[value.value];
    console.log("count", facetMap)
    return count;
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
                    {isChecked ? <CheckOutlined /> : <></>}
                    <span>{displayText}</span>
                </span>
            </Menu.Item>
        )
    })
    return menuItems;
}

const getSubMenu = ({ userChecks, setUserChecks, searchCriteria, setSearchCriteria,
    coldStart, setColdStart, menuFilters, setMenuFilters, facetCounts }) =>
    (key, titleText, icon, values) => {
        const handler = clickHandler({ userChecks, setUserChecks, searchCriteria, setSearchCriteria, coldStart, setColdStart });
        return (
            <SubMenu
                key={key}
                title={
                    <span>
                        { icon }
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

const getValues = (propertyValuesEntry) => {
    console.log(propertyValuesEntry)
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

const getMenuItemKey = (menuKey, value) => {
    // console.log("value: ", value);
    let strValue = '' + value.value;
    const itemKey = `${menuKey}_${strValue.replace(/ /g, '_')}`;
    return itemKey;
}

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

    const [movieYears, setMovieYears] = useState(PresetYearRanges);
    const [genres, setGenres] = useState([]);
    const [directors, setDirectors] = useState([]);
    const [revenues, setRevenue] = useState(PresetMovieRevenues);
    const [ratings, setRatings] = useState(PresetMovieRatings);
    const [runtimes, setRunTime] = useState(PresetMovieRunTimes);

    const [defaultOpenKeys, setDefaultOpenKeys] = useState([]);
    const [defaultSelectedKeys, setDefaultSelectedKeys] = useState([]);

    const handleReset = () => {
        setSearchCriteria({})
        setUserChecks({})
        setColdStart(false)
    };

    useEffect(() => {
        let getInitialFacets = async () => {
            let data = await runNeoApi(GetPropertyValuesMultiple, {
                listsToFetch: [
                    { label: "Genre", property: "name" },
                    //{ label: "Director", property: "name" }
                ]
            }, {});
            setLoading(false);
            setData(data);

            if (data && data.result) {
                data.result.forEach(resultItem => {
                    let x = resultItem.response;
                    if (x.label === 'Genre' && x.property === 'name') {
                        setGenres(getValues(x));
                    }
                    else if (x.label === 'Director' && x.property === 'name') {
                        setDirectors(getValues(x));
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
                    defaultSelectedKeys={defaultSelectedKeys}
                    defaultOpenKeys={defaultOpenKeys}
                    mode={'inline'}
                >
                    {
                        menu({ setSearchCriteria, genres, directors, movieYears, revenues, ratings, runtimes })
                    }
                </Menu>
            </div>
        )
    }
}

export default Facets;     