const DANTOTSU_ENDPOINT = "https://1224665.xyz:443";
const DANTOTSU_SECRET = "2QF^h%W%DrKdZwz8t&5S77S6GNRQm&";
const DANTOTSU_TOKEN_CACHE_DURATION = 6 * 24 * 60 * 60 * 1000; // 6 days

if(this.Awery != null) {
    Awery.setManifest({
        title: "Dantotsu Comments",
        id: "com.mrboomdev.awery.extension.dantotsu",
        version: "1.0.0",
        author: "MrBoomDev",
        features: [
            "media_comments",
            "media_comments_sort",
            "media_comments_vote",
            "account_login"
        ]
    });
} else {
    throw new Error("Script ran not in the Awery environment!");
}

function aweryMediaCommentsSortModes() {
    return [
        { id: "top", label: "Top Rated" },
        { id: "newest", label: "Newest" },
        { id: "oldest", label: "Oldest" },
        { id: "worst", label: "Worst Rated" }
    ];
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
        url: "https://anilist.co/api/v2/oauth/authorize?client_id=17466&response_type=token"
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

function aweryMyUser(callback) {
    callback.resolve({
        nickname: "TODO",
        avatar: "TODO"
    });
}

function aweryReadMediaComments(request, callback) {
    const id = request.media.getId("anilist");
    
    if(id == null) {
        callback.reject({id: "nothing_found"});
        return;
    }
    
    useDantotsuToken({
        resolve(result) {
            // First page id = 1, but Awery starts from 0, so we increment this value by 1
            request.page++;
    
            var url = DANTOTSU_ENDPOINT + "/comments/" + id + "/" + request.page + "/?";
    
            const args = [];
    
            if(request.episode != null) args.push(["tag", request.episode.number]);
            if(request.sort != null) args.push(["sort", request.sort.id]);
    
            for(var i = 0; i < args.length; i++) {
                var arg = args[i];
                url += arg[0] + "=" + arg[1] + "&";
            }
            
            Awery.fetch({
                url: url,
                
                headers: {
                    "appauth": DANTOTSU_SECRET,
                    "Authorization": result.authToken
                }
            }).then(function(response) {
                const json = JSON.parse(response.text).comments;
                const items = [];
                
                for(var i = 0; i < json.length; i++) {
                    var item = json[i];
                    
                    items.push({
                        authorName: item.username,
                        authorAvatar: item["profile_picture_url"],
                        text: item.content,
                        votes: item["total_votes"],
                        likes: -1,
                        dislikes: -1
                    });
                }
                
                callback.resolve({ items: items });
            }).catchException(function(e) {
                callback.reject({
                    id: "http_error",
                    extra: e
                });
            })
        },
        
        reject(error) {
           callback.reject(error);
        }
    });
}

function useDantotsuToken(callback) {
    const anilistToken = Awery.getSaved("anilistToken");
    
    if(anilistToken == null) {
        callback.reject({ id: "account_required" });
        return;
    }
    
    if(Awery.getSaved("dantotsuTokenDate") + DANTOTSU_TOKEN_CACHE_DURATION > java.lang.System.currentTimeMillis()) {
        callback.resolve(JSON.parse(Awery.getSaved("dantotsuSavedResponse")));
        return;
    }
    
    Awery.fetch({
        url: DANTOTSU_ENDPOINT + "/authenticate",
        method: "post",
        form: { "token": anilistToken },
        headers: { "appauth": DANTOTSU_SECRET }
    }).then(function(response) {
        if(response.statusCode == 200) {
            Awery.setSaved("dantotsuSavedResponse", response.text);
            Awery.setSaved("dantotsuTokenDate", java.lang.System.currentTimeMillis());
        
            callback.resolve(JSON.parse(response.text));
        } else if(response.statusCode == 429) {
            callback.reject({ id: "rate_limited" });
        } else {
            Awery.toast("Fail. " + response.text);
            callback.reject({ id: "other" });
        }
    }).catchException(function(e) {
        callback.reject({
            id: "http_error",
            extra: e
        });
    });
}



