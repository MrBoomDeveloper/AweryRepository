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
    version: "1.0.0",
    author: "MrBoomDev",
    features: [
        "search_tags",
        "search_media",
        
        "account_login",
        "account_track"
    ]
});

function formatDate(millis) {
    if(millis == null || millis <= 0) {
        return "{ year: null, month: null, day: null }";
    }
    
    var date = new Date(millis);
    return `{ year: ${date.getYear()}, month: ${date.getMonth()}, day: ${date.getDate()} }`;
}

function aweryTrackMedia(media, options, callback) {
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
                    scoreRaw: ${options.score * 10},
                    progress: ${Math.round(options.progress)},
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
    if(input.year == null && input.month == null && input.day == null) {
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

function awerySearchMedia(filters, callback) {
    var sort = "SEARCH_MATCH";
    var id = Number.NaN;
    var page = 0;
    var query;
    
    for(let i = 0; i < filters.length; i++) {
        var filter = filters[i];
        
        if(filter.id == "query") {
            query = filter.value;
            id = Number.parseInt(query);
        }
        
        if(filter.id == "page") {
            page = filter.value;
        }
    }
    
    //Why? Because anilist starts ids from 1, but awery starts from 0.
    page++;
    
    var params = "isAdult: false";
    params += ", type: ANIME";
    params += ", sort: " + sort;
    
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