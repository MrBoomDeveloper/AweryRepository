const ANILIST_GRAPHQL = "https://graphql.anilist.co/";
const ANILIST_API = "https://anilist.co/api/v2/"

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
function aweryTrackMedia(media, options, callback) {
    callback.resolve({
        features: [ "startDate", "endDate", "progress", "score", "private" ]
    })
}

function parseDate(input) {
    return new Date(input.year, input.month, input.day).toJSON();
}

function awerySearchMedia(filters, callback) {
    var sort = "SEARCH_MATCH", query, page = 0;
    
    for(let i = 0; i < filters.length; i++) {
        var filter = filters[i];
        
        if(filter.name == "query") query = filter.value;
        if(filter.name == "page") page = filter.value;
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
                        id idMal format duration countryOfOrigin
                        status episodes averageScore description 
                        title { romaji(stylised: false) english(stylised: false) native(stylised: false) }
                        genres tags { name description }
                        bannerImage coverImage { extraLarge large medium }
                        startDate { year month day }
                    }
                
                    pageInfo {
                        hasNextPage
                    }
                }
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
        
        for(var i = 0; i < json.data.Page.media.length; i++) {
            var jsonItem = json.data.Page.media[i];
            
            var status;
            
            switch(jsonItem.status) {
                case "FINISHED": status = "completed"; break;
                case "RELEASING": status = "ongoing"; break;
                case "NOT_YET_RELEASED": status = "coming_soon"; break;
                case "CANCELLED": status = "cancelled"; break;
                case "HIATUS": status = "paused"; break;
            }
            
            items.push({
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
                
                releaseDate: jsonItem.startDate != null 
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
            });
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
    return Awery.getSaved("anilistToken") != null;
}

function aweryLogOut(callback) {
    Awery.setSaved("anilistToken", null);
    Awery.setSaved("anilistExpiresIn", null);
    callback.resolve(true);
}