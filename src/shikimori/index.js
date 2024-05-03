const ENDPOINT_GRAPHQL = "https://shikimori.one/api/graphql";

Awery.setManifest({
    title: "Shikimori",
    id: "com.mrboomdev.awery.extension.shikimori",
    version: "1.0.0",
    author: "MrBoomDev",
    features: [
        "search_media",
        
        "account_login",
        "account_track"
    ]
});

function aweryIsLoggedIn() {
    return false;
}

function awerySearchMedia(filters, callback) {
    
}

function aweryTrackMedia(media, options, callback) {
    if(!(aweryIsLoggedIn())) {
        callback.reject({ id: "account_required" });
        return;
    }
    
    var id = media.getId("shikimori");
    
    if(id == null) {
        callback.reject({ id: "nothing_found" });
        return;
    }
}




