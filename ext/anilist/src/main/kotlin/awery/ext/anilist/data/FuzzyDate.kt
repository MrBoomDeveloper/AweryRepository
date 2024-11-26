package awery.ext.anilist.data

import kotlinx.serialization.Serializable
import java.util.Calendar

@Serializable
class FuzzyDate(
    val year: Int?,
    val month: Int?,
    val day: Int?
) {
    val timeInMillis: Long
        get() = Calendar.getInstance().apply {
            this@FuzzyDate.year?.let { set(Calendar.YEAR, it) }
            this@FuzzyDate.month?.let { set(Calendar.MONTH, it) }
            this@FuzzyDate.day?.let { set(Calendar.DAY_OF_MONTH, it) }
        }.timeInMillis
}