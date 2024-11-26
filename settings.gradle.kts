@file:Suppress("UnstableApiUsage")

pluginManagement {
    repositories {
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)

    repositories {
        mavenCentral()
    }
}

rootProject.name = "AweryOfficialRepo"
include(":ext")
include(":ext:anilist")
findProject(":ext:anilist")?.name = "anilist"
include("ext:dantotsu")
findProject(":ext:dantotsu")?.name = "dantotsu"
include("ext:myanimelist")
findProject(":ext:myanimelist")?.name = "myanimelist"
