plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

dependencies {
    implementation(kotlin("stdlib-jdk8"))
    implementation(libs.bundles.awery.ext)
    implementation(libs.bundles.ktor)
    implementation(libs.kotlinx.serialization.json)
}

kotlin {
    jvmToolchain(17)
}