package com.music

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

import org.jaudiotagger.audio.AudioFileIO
import org.jaudiotagger.tag.FieldKey
import org.jaudiotagger.tag.Tag
import org.jaudiotagger.tag.images.ArtworkFactory
import java.io.File
import android.util.Log

class Mp3TaggerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        Log.d("Mp3TaggerModule", "原生模块已注册") // ← 这里
    }

    override fun getName(): String {
        return "Mp3Tagger"
    }

    @ReactMethod
    fun embedTag(mp3Path: String, lyrics: String, imagePath: String, promise: Promise) {
        try {
            val mp3File = File(mp3Path)
            val imageFile = File(imagePath)

            val audioFile = AudioFileIO.read(mp3File)
            val tag: Tag = audioFile.tagOrCreateAndSetDefault

            // 嵌入歌词
            tag.setField(FieldKey.LYRICS, lyrics)

            // 嵌入封面图片
            val artwork = ArtworkFactory.createArtworkFromFile(imageFile)
            tag.deleteArtworkField()
            tag.setField(artwork)

            audioFile.commit()
            promise.resolve("嵌入成功")
        } catch (e: Exception) {
            promise.reject("TagError", e.message, e)
        }
    }
}
