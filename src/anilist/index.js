const ANILIST_GRAPHQL = "https://graphql.anilist.co/";
const ANILIST_API = "https://anilist.co/api/v2/"

const TRACKING_FIELDS = `
    status progress
    score(format: POINT_10_DECIMAL)
    private
                        
    startedAt { year month day }
    completedAt { year month day }
`;

const MEDIA_FIELDS = `
    id idMal format duration countryOfOrigin
    status episodes averageScore description 
    title { romaji(stylised: false) english(stylised: false) native(stylised: false) }
    genres tags { name description }
    bannerImage coverImage { extraLarge large medium }
    startDate { year month day }
`;

Awery.setManifest({
    title: "Anilist",
    id: "com.mrboomdev.awery.extension.anilist",
    version: "1.0.2",
    author: "MrBoomDev",
    features: [
        "search_tags",
        "search_media",
        
        "account_login",
        "account_track",
        
        "changelog"
    ]
});

function aweryChangelog(callback) {
    callback.resolve(`
        v1.0.2
        - Search filters
    `);
}

function aweryFilters(callback) {
    callback.resolve([
        { key: Awery.FILTER_QUERY, title: "Query", type: "string" },
        { key: Awery.FILTER_PAGE, title: "Page", type: "integer" },
        //{ key: Awery.FILTER_START_DATE, title: "Start date", type: "date" },
        //{ key: Awery.FILTER_END_DATE, title: "End date", type: "date" },
        
        {
            key: "sort_mode", title: "Sort mode", type: "select", value: "POPULARITY_DESC", items: [
                { key: "START_DATE", title: "Start date ascending" },
                { key: "START_DATE_DESC", title: "Start date descending" },
                { key: "SCORE", title: "Score ascending" },
                { key: "SCORE_DESC", title: "Score descending" },
                { key: "POPULARITY", title: "Popularity ascending" },
                { key: "POPULARITY_DESC", title: "Popularity descending" },
                { key: "TRENDING", title: "Trending ascending" },
                { key: "TRENDING_DESC", title: "Trending descending" },
                { key: "SEARCH_MATCH", title: "Search match" },
                { key: "UPDATED_AT", title: "Updated at ascending" },
                { key: "UPDATED_AT_DESC", title: "Updated at descending" },
                { key: "FAVOURITES", title: "Favourites ascending" },
                { key: "FAVOURITES_DESC", title: "Favourites descending" }
            ]
        },
        
        { key: "format", title: "Format", type: "select", items: [
            { key: "TV", title: "TV" },
            { key: "MOVIE", title: "Movie" },
            { key: "SPECIAL", title: "Special" },
            { key: "OVA", title: "Ova" },
            { key: "ONA", title: "Ona" },
            { key: "MANGA", title: "Manga" },
            { key: "NOVEL", title: "Novel" },
            { key: "MUSIC", title: "Music" }
        ] },
        
        { key: "satus", title: "Status", type: "select", items: [
            { key: "FINISHED", title: "Finished" },
            { key: "RELEASING", title: "Releasing" },
            { key: "NOT_YET_RELEASED", title: "Not yet released" },
            { key: "CANCELLED", title: "Cancelled" },
            { title: "HIATUS", title: "Hiatus" }
        ] },
        
        { key: "type", title: "Type", type: "select", items: [
            { key: "ANIME", title: "Anime" },
            { key: "MANGA", title: "Manga" }
        ] }
    ]);
}

function formatDate(millis) {
    if(millis == null || millis <= 0) {
        return "{ year: null, month: null, day: null }";
    }
    
    var date = new Date(millis);
    return `{ year: ${date.getYear()}, month: ${date.getMonth()}, day: ${date.getDate()} }`;
}

function aweryModifyEpisodes(videos) {
    //TODO
}

function aweryModifyVideo(video) {
    //TODO
}

function aweryTrackMedia(media, options, callback) {
    if(options != null && options.currentLists[0] == null) {
        callback.reject({ id: "message", extra: "You have to select at least one list!" });
        return;
    }
    
    if(!aweryIsLoggedIn()) {
        callback.reject({id: "account_required" });
        return;
    }
    
    var id = media.getId("anilist");
    var token = Awery.getSaved("anilistToken");
    
    if(id == null) {
        callback.reject({ id: "nothing_found" });
        return;
    }
    
    var params = {
        mediaId: id
    };
        
    Awery.fetch({
        url: ANILIST_GRAPHQL,
        contentType: "json",
        
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        
        body: JSON.stringify({
            query: (options == null) ? `{
                Media(id: ${id}) {
                    mediaListEntry { ${TRACKING_FIELDS} }
                }
            }`: `mutation {
                SaveMediaListEntry(
                    mediaId: ${id},
                    status: ${options.currentLists[0]},
                    scoreRaw: ${options.score != null ? Math.round(options.score * 10) : 0},
                    progress: ${options.progress != null ? Math.round(options.progress) : 0},
                    private: ${options.isPrivate},
                    startedAt: ${options.startDate != 0 ? formatDate(options.startDate) : "null"},
                    completedAt: ${options.endDate != 0 ? formatDate(options.endDate) : "null"}
                ) { ${TRACKING_FIELDS} }
            }`
        })
    }).then(function(res) {
        var json = JSON.parse(res.text);
        
        if(json.errors != null) {
            callback.reject({id: "other", extra: res.text })
            return;
        }
        
        var trackData = json.data.SaveMediaListEntry || json.data.Media.mediaListEntry;
        
        if(trackData == null) {
            trackData = {}
        }
            
        callback.resolve({
            currentLists: [ trackData.status ],
            progress: trackData.progress,
            score: trackData.score,
            isPrivate: trackData.private,
            startDate: parseDate(trackData.startedAt),
            endDate: parseDate(trackData.completedAt),
            id: id,
                
            lists: [
                { title: "Current", id: "CURRENT" },
                { title: "Planning", id: "PLANNING" },
                { title: "Completed", id: "COMPLETED" },
                { title: "Dropped", id: "DROPPED" },
                { title: "Paused", id: "PAUSED" },
                { title: "Repeating", id: "REPEATING" }
            ],
                
            features: [
                "startDate", 
                "endDate", 
                "progress", 
                "score", 
                "isPrivate", 
                "lists"
                // "createList"
            ]
        });
    }).catchException(function(e) {
        callback.reject("http_error", e);
    });
}

function parseDate(input) {
    if(input == null || (input.year == null && input.month == null && input.day == null)) {
        return null;
    }
    
    return new Date(input.year, input.month, input.day).toJSON();
}

function mapJsonMedia(jsonItem) {
    var status;
            
    switch(jsonItem.status) {
        case "FINISHED": status = "completed"; break;
        case "RELEASING": status = "ongoing"; break;
        case "NOT_YET_RELEASED": status = "coming_soon"; break;
        case "CANCELLED": status = "cancelled"; break;
        case "HIATUS": status = "paused"; break;
    }
    
    return {
        id: jsonItem.id,
        url: `https://anilist.co/anime/${jsonItem.id}`,
        banner: jsonItem.bannerImage,
        description: jsonItem.description,
        format: jsonItem.format,
        duration: jsonItem.duration,
        country: jsonItem.countryOfOrigin,
        status: status,
        episodesCount: jsonItem.episodes,
        averageScore: jsonItem.averageScore,
        ageRating: jsonItem.isAdult ? "R": undefined,
                
        tags: jsonItem.tags,
        genres: jsonItem.genres,
                
        endDate: jsonItem.startDate != null 
            ? parseDate(jsonItem.startDate) : undefined,
                
        ids: {
            anilist: jsonItem.id,
            myanimelist: jsonItem.idMal
        },
                
        titles: [
            jsonItem.title.english,
            jsonItem.title.romaji,
            jsonItem.title.native
        ],
                
        poster: {
            extraLarge: jsonItem.coverImage.extraLarge,
            large: jsonItem.coverImage.large,
            medium: jsonItem.coverImage.medium
        }
    }
}

function getFilter(filters, key, defaultValue) {
    for(let i = 0; i < filters.length; i++) {
        var filter = filters[i];
        
        if(filter.key == key) {
            return filter.value;
        }
    }
    
    return defaultValue;
}

function awerySearchMedia(filters, callback) {
    var sort = getFilter(filters, "sort_mode");
    var query = getFilter(filters, Awery.FILTER_QUERY);
    var page = getFilter(filters, Awery.FILTER_PAGE, 0) + 1;
    var format = getFilter(filters, "format");
    var type = getFilter(filters, "type");
    var status = getFilter(filters, "status");
    
    var id = query != undefined 
        ? Number.parseInt(query) 
        : Number.NaN;
    
    var params = "isAdult: false";
    
    if(sort != null) {
        params += ", sort: " + sort;
    } else if(query != null) {
        params += ", sort: SEARCH_MATCH";
    }
    
    if(type != null) {
        params += ", type: " + type;
    }
    
    if(format != null) {
        params += ", format: " + format;
    }
    
    if(status != null) {
        params += ", status: " + status;
    }
    
    if(query != null) {
        params += ', search: \\"' + query + '\\"';
    }
    
    Awery.fetch({
        url: ANILIST_GRAPHQL,
        contentType: "json",
        
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        
        body: JSON.stringify({
            query: `{
                Page(page: __PAGE__, perPage: 20) {
                    media(__PARAMS__) { 
                        ${MEDIA_FIELDS}
                    }
                
                    pageInfo {
                        hasNextPage
                    }
                }
                
                ${!Number.isNaN(id) ? `
                    Media(id: ${id}) { 
                        ${MEDIA_FIELDS}
                    }
                ` : ""}
            }`
        }).replace("__PAGE__", page)
            .replace("__PARAMS__", params)
    }).then(function(res) {
        if(!res.text.startsWith("{")) {
            callback.reject({ "id": "http_error" });
            return;
        }
        
        var json = JSON.parse(res.text);
        var items = [];
        
        if(json.errors != null) {
            callback.reject({ id: "other", extra: json.errors })
            return;
        }
        
        if(json.data.Media != null) {
            items.push(mapJsonMedia(json.data.Media));
        }
        
        for(var i = 0; i < json.data.Page.media.length; i++) {
            var jsonItem = json.data.Page.media[i];
            items.push(mapJsonMedia(jsonItem));
        }
        
        callback.resolve({
            hasNextPage: json.data.Page.pageInfo.hasNextPage,
            items: items
        });
    }).catchException(function(e) {
        callback.reject({ id: "other", extra: e })
    });
}

function awerySearchTags(filter, callback) {
    Awery.fetch({
		
	}).then(function(res) {
		
	});
}

function aweryLogin(request, callback) {
    const expiresWord = "expires_in=";
    const tokenWord = "access_token=";
    
    var url = request.url;
    url = url.substring(url.indexOf(tokenWord) + tokenWord.length);
    
    const token = url.substring(0, url.indexOf("&"));
    const expiresIn = url.substring(url.indexOf(expiresWord) + expiresWord.length);
    
    Awery.setSaved("anilistToken", token);
    Awery.setSaved("anilistExpiresIn", expiresIn);
    
    callback.resolve(true);
}

function aweryLoginScreen(callback) {
    callback.resolve({
        action: "open_browser",
        url: ANILIST_API + "oauth/authorize?client_id=17466&response_type=token"
    });
}

function aweryIsLoggedIn() {
    //TODO: Check if the token did expire

    var token = Awery.getSaved("anilistToken");
    return token != null;
}

function aweryLogOut(callback) {
    Awery.setSaved("anilistToken", null);
    Awery.setSaved("anilistExpiresIn", null);
    callback.resolve(true);
}