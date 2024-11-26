package awery.ext.anilist.data

import com.mrboomdev.awery.ext.constants.AweryAgeRating
import com.mrboomdev.awery.ext.data.CatalogMedia
import com.mrboomdev.awery.ext.data.CatalogTag
import com.mrboomdev.awery.ext.source.Source
import kotlinx.serialization.Serializable

@Serializable
class Media(
    val id: Int,
    val idMal: Int?,
    val title: Title?,
    val type: Type?,
    val format: Format?,
    val status: Status?,
    val description: String?,
    val startDate: FuzzyDate?,
    val endDate: FuzzyDate?,
    val episodes: Int?,
    val duration: Int?,
    val chapters: Int?,
    val countryOfOrigin: String?,
    val coverImage: CoverImage?,
    val bannerImage: String?,
    val genres: Array<String>?,
    val synonyms: List<String>?,
    val averageScore: Int?,
    val tags: Array<Tag>?,
    val isAdult: Boolean?
) {
    fun toCatalogMedia(source: Source) = CatalogMedia(
        globalId = "${source.manager.id};;;${source.id};;;$id",
        description = description,
        country = countryOfOrigin,
        genres = genres,
        banner = bannerImage,
        duration = duration,
        episodesCount = episodes ?: chapters,
        averageScore = averageScore?.let { it.toFloat() / 100 },
        ageRating = if(isAdult == true) AweryAgeRating.NSFW else null,
        poster = coverImage?.extraLarge ?: coverImage?.large ?: coverImage?.medium,
        releaseDate = startDate?.timeInMillis ?: endDate?.timeInMillis,

        tags = tags?.map {
            CatalogTag(
                name = it.name,
                description = it.description,
                isAdult = it.isAdult ?: false,
                isSpoiler = it.isMediaSpoiler ?: it.isGeneralSpoiler ?: false
            )
        }?.toTypedArray(),

        ids = mutableMapOf<String, String>().apply {
            put("anilist", id.toString())
            idMal?.let { put("myanimelist", it.toString()) }
        }.toMap(),

        type = when(format) {
            Format.MOVIE -> CatalogMedia.Type.MOVIE

            else -> when(type) {
                Type.ANIME -> CatalogMedia.Type.TV
                Type.MANGA -> CatalogMedia.Type.BOOK
                else -> null
            }
        },

        status = when(status) {
            Status.FINISHED -> CatalogMedia.Status.COMPLETED
            Status.CANCELLED -> CatalogMedia.Status.CANCELLED
            //Status.HIATUS -> CatalogMedia.Status.DELAYED TODO: Add delayed
            Status.NOT_YET_RELEASED -> CatalogMedia.Status.COMING_SOON
            Status.RELEASING -> CatalogMedia.Status.ONGOING
            else -> null
        },

        titles = buildList {
            add(title?.english)
            add(title?.romaji)
            add(title?.native)
            synonyms?.let { addAll(it) }
        }.filterNotNull().toTypedArray()
    )

    @Serializable
    class Title(
        val romaji: String?,
        val english: String?,
        val native: String?
    )

    enum class Type {
        ANIME,
        MANGA
    }

    enum class Format {
        MOVIE,
        MANGA,
        NOVEL,
        ONE_SHOT
    }

    enum class Status {
        FINISHED,
        RELEASING,
        NOT_YET_RELEASED,
        CANCELLED,
        HIATUS
    }

    @Serializable
    class CoverImage(
        val extraLarge: String?,
        val large: String?,
        val medium: String?
    )

    @Serializable
    class Tag(
        val name: String,
        val description: String?,
        val isGeneralSpoiler: Boolean?,
        val isMediaSpoiler: Boolean?,
        val isAdult: Boolean?
    )
}