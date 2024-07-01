const DANTOTSU_ENDPOINT = "https://api.dantotsu.app";
const DANTOTSU_SECRET = "2QF^h%W%DrKdZwz8t&5S77S6GNRQm&";
const DANTOTSU_TOKEN_CACHE_DURATION = 6 * 24 * 60 * 60 * 1000; // 6 days

Awery.setManifest({
    title: "Dantotsu Comments",
    id: "com.mrboomdev.awery.extension.dantotsu",
    adultContent: "NONE",
    version: "1.0.3",
    author: "MrBoomDev",
    
    features: [
        "MEDIA_COMMENTS",
        //"media_comments_sort",
        "MEDIA_COMMENTS_PER_PAGE",
        "ACCOUNT_LOGIN",
        "CHANGELOG"
    ]
});

function aweryChangelog(callback) {
    callback.resolve(`
        v1.0.3
        - Deleted your own or other's comments if you're an moderator
        - Any your comment can now be edited
        
        Big thanks to Rebel, the creator of Dantotsu,
        for providing me access to his comments server!
        If not him, there would be no comments at all!
    `);
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
        action: "OPEN_BROWSER",
        url: "https://anilist.co/api/v2/oauth/authorize?client_id=17466&response_type=token"
    });
}

function aweryIsLoggedIn() {
    //TODO: Check if the token did expire
    
    var anilistToken = Awery.getSaved("anilistToken");
    return anilistToken != null;
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

function aweryDeleteComment(comment, callback) {
    useDantotsuToken({
        resolve(result) {
            Awery.fetch({
                url: `${DANTOTSU_ENDPOINT}/comments/${comment.id}`,
                method: "DELETE",
                
                headers: {
                    "appauth": DANTOTSU_SECRET,
                    "Authorization": result.authToken
                }
            }).then(function(response) {
                if(response.statusCode != 200) {
                    callback.reject({ id: "OTHER", extra: response.text });
                    return;
                }
                
                callback.resolve(true);
            }).catchException(function(e) {
                callback.reject({
                    id: "HTTP_ERROR",
                    extra: e
                });
            });
        },
        
        reject(e) {
            callback.reject(e);
        }
    });
}

function aweryEditComment(oldComment, newComment, callback) {
    useDantotsuToken({
        resolve(result) {
            Awery.fetch({
                url: `${DANTOTSU_ENDPOINT}/comments/${oldComment.id}`,
                method: "PUT",
                
                form: {
                    content: newComment.text
                },
                
                headers: {
                    "appauth": DANTOTSU_SECRET,
                    "Authorization": result.authToken
                }
            }).then(function(response) {
                if(response.statusCode != 200) {
                    callback.reject({ id: "OTHER", extra: response.text });
                    return;
                }
                
                callback.resolve(Object.assign(result, oldComment, newComment));
            }).catchException(function(e) {
                callback.reject({
                    id: "HTTP_ERROR",
                    extra: e
                });
            });
        },
        
        reject(e) {
            callback.reject(e);
        }
    });
}

function aweryVoteComment(comment, callback) {
    useDantotsuToken({
        resolve(result) {
            Awery.fetch({
                url: `${DANTOTSU_ENDPOINT}/comments/vote/${comment.id}/${comment.voteState}`,
                method: "POST",
                headers: {
                    "appauth": DANTOTSU_SECRET,
                    "Authorization": result.authToken
                }
            }).then(function(response) {
                if(response.statusCode != 200) {
                    callback.reject({
                        id: "OTHER",
                        extra: `Ask MrBoomDev to fix it! ${response.text}`
                    });
                }
                
                callback.resolve(comment);
            }).catchException(function(e) {
                callback.reject({
                    id: "HTTP_ERROR",
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
    var voteState = item["user_vote_type"];
    
    return {
        authorName: item.username,
        authorAvatar: item["profile_picture_url"],
        text: item.content,
        likes: item.upvotes - (voteState == 1 ? 1 : 0),
        dislikes: item.downvotes - (voteState == -1 ? 1 : 0),
        canComment: true,
        comments: item["reply_count"],
        date: item.timestamp,
        id: item["comment_id"],
        voteState: voteState
    }
}

function aweryPostMediaComment(request, callback) {
    useDantotsuToken({
        resolve(result) {
            const form = {
                "user_id": result.user["user_id"],
                "media_id": request.parentComment.mediaId,
                "content": request.comment.text
            };
            
            if(request.episode != null) {
                form.tag = request.episode.number;
            }
            
            if(request.parentComment.id != null) {
                form["parent_comment_id"] = request.parentComment.id;
            }
            
            Awery.fetch({
                url: DANTOTSU_ENDPOINT + "/comments",
                method: "POST",
                form: form,
                
                headers: {
                    "appauth": DANTOTSU_SECRET,
                    "Authorization": result.authToken
                }
            }).then(function(response) {
                const res = JSON.parse(response.text);
                
                if(response.statusCode == 500) {
                    if(res.message == "not_english") {
                        callback.reject({ id: "MESSAGE", extra: "You can't use non-english!" });
                    } else {
                        callback.reject({ id: "OTHER", extra: res })
                    }
                    
                    return;
                }
                
                const comment = createComment(res);
                comment.authorName = result.user.username;
                comment.authorAvatar = result.user["profile_picture_url"];
                comment.items = [];
                callback.resolve(comment);
            }).catchException(function(e) {
                callback.reject({
                    id: "HTTP_ERROR",
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
        callback.reject({id: "NOTHING_FOUND"});
        return;
    }
    
    useDantotsuToken({
        resolve(result) {
            // First page id = 1, but Awery starts from 0, so we increment this value by 1
            request.page++;
    
            var url = DANTOTSU_ENDPOINT + "/comments/";
            var parentId;
            
            if(request.parentComment != null && request.parentComment.id != null) {
                parentId = request.parentComment.id;
                url += "parent/" + parentId + "/" + request.page;
            } else {
                url += id + "/" + request.page + "/?";
                
                var args = [];
    
                if(request.episode != null) args.push(["tag", request.episode.number]);
                if(request.sort != null) args.push(["sort", request.sort.id]);
    
                for(var i = 0; i < args.length; i++) {
                    var arg = args[i];
                    url += arg[0] + "=" + arg[1] + "&";
                }
            }
            
            Awery.fetch({
                url: url,
                
                headers: {
                    "appauth": DANTOTSU_SECRET,
                    "Authorization": result.authToken
                }
            }).then(function(response) {
                if(response.text == "Forbidden") {
                    callback.reject({ id: "OTHER", extra: "Your token has expired. Tell MrBoomDev that it did happened!" });
                    return;
                }
                
                if(response.statusCode == 429) {
                    callback.reject({ id: "RATE_LIMITED" });
                    return;
                }
                
                const json = JSON.parse(response.text);
                const items = [];
                
                if(json.comments == null) {
                    var comment = {
                        canComment: true,
                        mediaId: id,
                        id: parentId,
                        userId: result["user_id"]
                    };
                    
                    if(request.parentComment != null) {
                        comment = Object.assign(comment, request.parentComment);
                    }
                    
                    callback.resolve(comment);
                    return;
                }
                
                for(var i = 0; i < json.comments.length; i++) {
                    var item = json.comments[i];
                    var comment = createComment(item);
                    comment.mediaId = id;
                    comment.isEditable = (result.user["user_id"] == item["user_id"]);
                    comment.isDeletable = comment.isEditable || result.user["is_admin"] || result.user["is_mod"];
                    items.push(comment);
                }
                
                callback.resolve(Object.assign(request.parentComment == null ? {}
                : JSON.parse(JSON.stringify(request.parentComment)), {
                    canComment: result["is_banned"] == null, 
                    items: items,
                    mediaId: id,
                    id: parentId,
                    userId: result["user_id"],
                    hasNextPage: json.totalPages > request.page
                }));
            }).catchException(function(e) {
                callback.reject({
                    id: "HTTP_ERROR",
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
    const dantotsuTokenUntil = Awery.getSaved("dantotsuTokenUntil");
    
    if(anilistToken == null) {
        callback.reject({ id: "ACCOUNT_REQUIRED" });
        return;
    }
    
    if(dantotsuTokenUntil != null) {
        var compared = Awery.compareNumbers(dantotsuTokenUntil, Awery.currentTime());
        
        if(compared > 0) {
            callback.resolve(JSON.parse(Awery.getSaved("dantotsuSavedResponse")));
            return;
        }
    }
    
    Awery.fetch({
        url: DANTOTSU_ENDPOINT + "/authenticate",
        method: "POST",
        form: { "token": anilistToken },
        headers: { "appauth": DANTOTSU_SECRET }
    }).then(function(response) {
        if(response.statusCode == 200) {
            Awery.setSaved("dantotsuSavedResponse", response.text);
            Awery.setSaved("dantotsuTokenUntil", java.lang.System.currentTimeMillis() + DANTOTSU_TOKEN_CACHE_DURATION);
        
            callback.resolve(JSON.parse(response.text));
        } else if(response.statusCode == 429) {
            callback.reject({ id: "RATE_LIMITED" });
        } else {
            Awery.toast("Fail. " + response.text);
            callback.reject({ id: "OTHER" });
        }
    }).catchException(function(e) {
        callback.reject({
            id: "HTTP_ERROR",
            extra: e
        });
    });
}



