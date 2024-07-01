const ANILIST_GRAPHQL = "https://graphql.anilist.co";
const ANILIST_API = "https://anilist.co/api/v2"
const VERSION = "1.0.3";

const TRACKING_FIELDS = `
    status progress
    score(format: POINT_10_DECIMAL)
    private
                        
    startedAt { year month day }
    completedAt { year month day }
`;

const MEDIA_FIELDS = `
    id idMal format duration countryOfOrigin type format
    status episodes averageScore description 
    title { romaji(stylised: false) english(stylised: false) native(stylised: false) }
    genres tags { name description isMediaSpoiler }
    bannerImage coverImage { extraLarge large medium }
    startDate { year month day }
`;

Awery.setManifest({
    title: "Anilist",
    id: "com.mrboomdev.awery.extension.anilist",
    adultContent: "HIDDEN",
    version: VERSION,
    author: "MrBoomDev",
    features: [
        "SEARCH_TAGS",
        "SEARCH_MEDIA",
        
        "ACCOUNT_LOGIN",
        "ACCOUNT_TRACK",
        
        "CHANGELOG",
        "SETTINGS"
    ]
});

function aweryChangelog(callback) {
    callback.resolve(`
        v.1.0.3
        - New filters
        - Anilist account settings (W.I.P)
    
        v.1.0.2
        - Search filters
    `);
}

function aweryFilters(callback) {
    callback.resolve([
        //{ key: Awery.FILTER_START_DATE, title: "Start date", type: "date" },
        //{ key: Awery.FILTER_END_DATE, title: "End date", type: "date" },
        
        {
            key: "sort_mode", type: "SELECT",
            title: "Sort mode", description: "${VALUE}", items: [
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
        }, { 
            key: "format", type: "SELECT", 
            title: "Format", description: "${VALUE}", items: [
                { key: "TV", title: "TV" },
                { key: "MOVIE", title: "Movie" },
                { key: "SPECIAL", title: "Special" },
                { key: "OVA", title: "Ova" },
                { key: "ONA", title: "Ona" },
                { key: "MANGA", title: "Manga" },
                { key: "NOVEL", title: "Novel" },
                { key: "MUSIC", title: "Music" }
            ] 
        }, { 
            key: "status", type: "SELECT", 
            title: "Status", description: "${VALUE}", items: [
                { key: "FINISHED", title: "Finished" },
                { key: "RELEASING", title: "Releasing" },
                { key: "NOT_YET_RELEASED", title: "Not yet released" },
                { key: "CANCELLED", title: "Cancelled" },
                { key: "HIATUS", title: "Hiatus" }
            ]
        }, { 
            key: "type", type: "SELECT", 
            title: "Type", description: "${VALUE}", items: [
                { key: "ANIME", title: "Anime" },
                { key: "MANGA", title: "Manga" }
            ]
        }
    ]);
}

function formatDate(millis) {
    if(millis == null || millis <= 0) {
        return "{ year: null, month: null, day: null }";
    }
    
    var date = new Date(millis);
    return `{ year: ${date.getYear()}, month: ${date.getMonth()}, day: ${date.getDate()} }`;
}

function aweryModifyEpisodes(episodes) {
    //TODO
}

function aweryModifyVideos(videos) {
    //TODO
}

function aweryTrackMedia(media, options, callback) {
    if(options != null && options.currentLists[0] == null) {
        callback.reject({ id: "MESSAGE", extra: "You have to select at least one list!" });
        return;
    }
    
    if(!aweryIsLoggedIn()) {
        callback.reject({ id: "ACCOUNT_REQUIRED" });
        return;
    }
    
    var id = media.getId("anilist");
    var token = Awery.getSaved("anilistToken");
    
    if(id == null) {
        callback.reject({ id: "NOTHING_FOUND" });
        return;
    }
    
    var params = {
        mediaId: id
    };
        
    Awery.fetch({
        url: ANILIST_GRAPHQL,
        contentType: "JSON",
        
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
            callback.reject({ id: "OTHER", extra: res.text })
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
        callback.reject({ id: "HTTP_ERROR", extra: e });
    });
}

function parseDate(input) {
    if(input == null || (input.year == null && input.month == null && input.day == null)) {
        return null;
    }
    
    return new Date(input.year, input.month, input.day).toJSON();
}

function mapJsonTags(jsonTags) {
    var tags = [];
    
    for(var i = 0; i < jsonTags.length; i++) {
        var tag = jsonTags[i];
        
        tags.push({
            name: tag.name,
            description: tag.description,
            isSpoiler: tag.isMediaSpoiler
        });
    }
    
    return tags;
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
        averageScore: jsonItem.averageScore != null ? (jsonItem.averageScore / 10) : null,
        ageRating: jsonItem.isAdult ? "NSFW": undefined,
        
        type: (jsonItem.format == "MOVIE" ? "movie" :
            (jsonItem.type == "ANIME" ? "tv" : "book")),
                
        tags: mapJsonTags(jsonItem.tags),
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
    
    if(query != null && query.trim().length == 0) {
        query = null;
    }
    
    var id = query != undefined 
        ? Number.parseInt(query) 
        : Number.NaN;
        
    var params = [];
    
    if(Awery.getAdultMode() == "ONLY") params.push("isAdult: true");
    else if(Awery.getAdultMode() == "SAFE") params.push("isAdult: false");
    
    if(sort != null) {
        params.push(`sort: ${sort}`);
    } else if(query != null) {
        params.push("sort: SEARCH_MATCH");
    }
    
    if(type != null) {
        params.push(`type: ${type}`);
    }
    
    if(format != null) {
        params.push(`format: ${format}`);
    }
    
    if(status != null) {
        params.push(`status: ${status}`);
    }
    
    if(query != null) {
        params.push(`search: "${query}"`);
    }
    
    var query = JSON.stringify({
        query: `{
            Page(page: ${page}, perPage: 20) {
                media(${params.join(", ")}) { 
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
    });
    
    Awery.fetch({
        url: ANILIST_GRAPHQL,
        contentType: "JSON",
        
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        
        body: query
    }).then(function(res) {
        if(!res.text.startsWith("{")) {
            callback.reject({ id: "HTTP_ERROR", "extra": "Anilist is down :(" });
            return;
        }
        
        var json = JSON.parse(res.text);
        var items = [];
        
        if(json.errors != null) {
            callback.reject({ id: "OTHER", extra: `Error:\n${JSON.stringify(json.errors)}\n\nQuery:\n${query}` })
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
        callback.reject({ id: "OTHER", extra: e })
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
        action: "OPEN_BROWSER",
        url: `${ANILIST_API}/oauth/authorize?client_id=17466&response_type=token`
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