@file:Suppress("unused")

package awery.ext.anilist

import awery.ext.anilist.data.Page
import com.mrboomdev.awery.ext.constants.AweryAgeRating
import com.mrboomdev.awery.ext.constants.AweryFeature
import com.mrboomdev.awery.ext.data.CatalogSearchResults
import com.mrboomdev.awery.ext.data.Settings
import com.mrboomdev.awery.ext.source.Source
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class Anilist: Source() {
    private val httpClient = HttpClient(CIO)

    override val ageRating = AweryAgeRating.EVERYONE
    override val exception = null
    override val icon = null

    // TODO: lateinit these members by an manager
    override val id = TODO()
    override val name = TODO()
    override val manager = TODO()

    override val features = arrayOf(
        AweryFeature.FEEDS,
        AweryFeature.TRACKING,
        AweryFeature.CUSTOM_SETTINGS,
        AweryFeature.SEARCH_MEDIA
    )

    @Suppress("UNCHECKED_CAST")
    override suspend fun <E, T : Catalog<E>> search(
        catalog: T, filters: Settings
    ): CatalogSearchResults<E> {
        return when(catalog) {
            is Catalog.Media -> query("""
                {
                    "query": {
                        Page(page: ${filters[FILTER_PAGE]?.value ?: 0}, perPage: 25) {
                            pageInfo {
                                hasNextPage
                            }
                            
                            media(search: "${filters[FILTER_QUERY]?.value}") {
                                id
                                idMal
                                type
                                format
                                isAdult
                                averageScore
                                episodes duration chapters
                                countryOfOrigin
                                synonyms
                                bannerImage
                                genres
                                
                                status(version: 2)
                                description(asHtml: true)
                                
                                startDate { year month day } 
                                endDate { year month day }
                                title { english native romaji }
                                coverImage { extraLarge large medium }
                                tags { name description isGeneralSpoiler isMediaSpoiler isAdult }
                            }
                        }
                    }
                }
            """.trimIndent()).let { response ->
                CatalogSearchResults(
                    items = response.data.Page.media!!.map { it.toCatalogMedia(this) },
                    hasNextPage = response.data.Page.pageInfo!!.hasNextPage ?: false
                ) as CatalogSearchResults<E>
            }

            else -> throw UnsupportedOperationException("Unsupported catalog! $catalog")
        }
    }

    private suspend  fun query(query: String): Response {
        return httpClient.post("https://graphql.anilist.co") {
            headers {
                append("Content-Type", "application/json")
                append("Accept", "application/json")
            }

            setBody(query.trimIndent())
        }.let {
            Json.decodeFromString(it.bodyAsText())
        }
    }

    @Serializable
    class Response(
        val data: Data
    ) {
        @Serializable
        class Data(
            @Suppress("PropertyName") val Page: Page
        )
    }
}