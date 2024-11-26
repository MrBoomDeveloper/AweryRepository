package awery.ext.anilist.data

import kotlinx.serialization.Serializable

@Serializable
class Page(
    val pageInfo: PageInfo?,
    val users: Array<User>?,
    val media: Array<Media>?,
    val recommendations: Array<Recommendation>?
)

@Serializable
class PageInfo(
    val hasNextPage: Boolean?
)