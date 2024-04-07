const DANTOTSU_ENDPOINT = "https://1224665.xyz:443";
const DANTOTSU_SECRET = "2QF^h%W%DrKdZwz8t&5S77S6GNRQm&";
const DANTOTSU_TOKEN_CACHE_DURATION = 6 * 24 * 60 * 60 * 1000; // 6 days

Awery.setManifest({
    title: "Dantotsu Comments",
    id: "com.mrboomdev.awery.extension.dantotsu",
    version: "1.0.0",
    author: "MrBoomDev",
    features: [
        "media_comments",
        "media_comments_sort",
        "account_login"
    ]
});

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

function aweryDeleteComment(request, callback) {
    useDantotsuToken({
        resolve(result) {
            Awery.fetch({
                url: DANTOTSU_ENDPOINT
            }).then(function(response) {
                
            }).catchException(function(e) {
                callback.reject({
                    id: "http_error",
                    extra: e
                });
            });
        },
        
        reject(e) {
            callback.reject(e);
        }
    });
}

function aweryEditComment(request, callback) {
    useDantotsuToken({
        resolve(result) {
            Awery.fetch({
                url: DANTOTSU_ENDPOINT
            }).then(function(response) {
                
            }).catchException(function(e) {
                callback.reject({
                    id: "http_error",
                    extra: e
                });
            });
        },
        
        reject(e) {
            callback.reject(e);
        }
    });
}

function aweryVoteComment(request, callback) {
    useDantotsuToken({
        resolve(result) {
            Awery.fetch({
                url: DANTOTSU_ENDPOINT
            }).then(function(response) {
                
            }).catchException(function(e) {
                callback.reject({
                    id: "http_error",
                    extra: e
                });
            });
        },
        
        reject(e) {
            callback.reject(e);
        }
    });
}

function createComment(item) {
    return {
        authorName: item.username,
        authorAvatar: item["profile_picture_url"],
        text: item.content,
        likes: item.upvotes,
        dislikes: item.downvotes,
        canComment: true,
        comments: item["reply_count"],
        date: item.timestamp,
        id: item["comment_id"],
        __TYPE__: 1
    }
}

function aweryPostMediaComment(parentComment, newComment, callback) {
    useDantotsuToken({
        resolve(result) {
            const form = {
                "user_id": result.user["user_id"],
                "media_id": parentComment.mediaId,
                "content": newComment.text
            };
            
            /*if(request.episode != null) {
                form.tag = request.episode.number;
            }*/
            
            if(parentComment.id != null) {
                form["parent_comment_id"] = parentComment.id;
            }
            
            Awery.fetch({
                url: DANTOTSU_ENDPOINT + "/comments",
                method: "post",
                form: form,
                
                headers: {
                    "appauth": DANTOTSU_SECRET,
                    "Authorization": result.authToken
                }
            }).then(function(response) {
                const res = JSON.parse(response.text);
                
                const comment = createComment(res);
                comment.authorName = result.user.username;
                comment.authorAvatar = result.user["profile_picture_url"];
                comment.items = [];
                callback.resolve(comment);
            }).catchException(function(e) {
                callback.reject({
                    id: "http_error",
                    extra: e
                })
            });
        },
        
        reject(e) {
            callback.reject(e);
        }
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
    
            var url = DANTOTSU_ENDPOINT + "/comments/";
            var parentId;
            
            if(request.parentComment == null) {
                url += id + "/" + request.page + "/?";
                
                const args = [];
    
                if(request.episode != null) args.push(["tag", request.episode.number]);
                if(request.sort != null) args.push(["sort", request.sort.id]);
    
                for(var i = 0; i < args.length; i++) {
                    var arg = args[i];
                    url += arg[0] + "=" + arg[1] + "&";
                }
            } else {
                parentId = request.parentComment.id;
                url += "parent/" + parentId + "/" + request.page;
            }
            
            Awery.fetch({
                url: url,
                
                headers: {
                    "appauth": DANTOTSU_SECRET,
                    "Authorization": result.authToken
                }
            }).then(function(response) {
                if(response.text == "Forbidden") {
                    callback.reject({ id: "other", extra: "Your token has expired. Tell developer that it did happened!" });
                    return;
                }
                
                const json = JSON.parse(response.text);
                const items = [];
                
                if(json.comments == null) {
                    callback.reject({ id: "nothing_found" });
                    return;
                }
                
                for(var i = 0; i < json.comments.length; i++) {
                    var item = json.comments[i];
                    var comment = createComment(item);
                    comment.mediaId = id;
                    items.push(comment);
                }
                
                callback.resolve(Object.assign(request.parentComment == null ? {}
                : JSON.parse(JSON.stringify(request.parentComment)), {
                    canComment: true, 
                    items: items,
                    mediaId: id,
                    id: parentId,
                    userId: result["user_id"],
                    __TYPE__: 2
                }));
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

    if(Awery.getSaved(Number("dantotsuTokenUntil")) < java.lang.System.currentTimeMillis() + DANTOTSU_TOKEN_CACHE_DURATION) {
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
            Awery.setSaved("dantotsuTokenUntil", java.lang.System.currentTimeMillis() + DANTOTSU_TOKEN_CACHE_DURATION);
        
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



