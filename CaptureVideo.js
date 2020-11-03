'use strict'
const fs = require('fs')
const axios = require('axios')
const { toSnakeCase, mergeAudioVideo } = require('./utils')
const { sanitizeUrlFromReddit } = require('./UrlValidator.js')

/**
 * Downloads v.redd.it video.
 * video === true && audio === true <default>: gets video with audio.
 * video === true && audio === false: video without audio (mp4 GIF).
 * video === false && audio === true: audio without video.
 * video === false && audio === false: throw an error.
 *
 * @param url {String}
 * @param outputPath {String}
 * @param outputFileName
 * @param method {String}
 * @param responseType {String}
 * @param video {Boolean}
 * @param audio {Boolean}
 * @return {Promise<void>}
 */
module.exports.downloadVredditVideo =
  async (
    url, outputPath, outputFileName = 'default',
    method = 'get', responseType = 'stream', video = true,
    audio = true
  ) => {
    try {
      let redditVideo, redditAudio, title
      if (video === false && audio === false) {
        throw new Error('variables audio and video cannot be both false')
      }
      const sanitizedUrl = await sanitizeUrlFromReddit(url)
      if (outputFileName === 'default') {
        title = toSnakeCase(sanitizedUrl.title)
      } else {
        title = outputFileName
      }
      if (video) {
        redditVideo = captureMediaStream(
          sanitizedUrl.videoUrl, title + '_temp' + '.mp4',
          outputPath)
      }

      if (sanitizedUrl.audioUrl !== '') {
        if (audio) {
          redditAudio = captureMediaStream(
            sanitizedUrl.audioUrl, title + '_temp' + '_audio' + '.mp3',
            outputPath)
        }
        if (video === true && audio === true) {
          const values = await Promise.all([redditVideo, redditAudio])
          await mergeAudioVideo(values[0], values[1], outputPath +
            toSnakeCase(sanitizedUrl.title) + '.mp4')
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

/**
 *
 * @param url
 * @param outputFileName
 * @param method
 * @param responseType
 * @param outputPath
 * @return {Promise<string>}
 */
const captureMediaStream =
  (
    url, outputFileName, outputPath, method = 'get', responseType = 'stream'
  ) => {
    return new Promise((resolve, reject) => {
      const buffArray = []
      axios({
        method: method,
        url: url,
        responseType: responseType
      }).then((response) => {
        if (response.status === 200) {
          response.data.on('data', (chunk) => {
            buffArray.push(chunk)
          })
          response.data.on('end', () => {
            const buff = Buffer.concat(buffArray)
            fs.writeFile(outputPath + outputFileName, buff, (err) => {
              if (err) {
                reject(err)
                console.log('Error while writing file :' + outputFileName)
              } else {
                resolve(outputPath + outputFileName)
                console.log('File created at: ' + outputPath + outputFileName)
              }
            })
          })
        } else {
          throw new Error('error while downloading from' + url + 'Error Code:' +
            response.data.statusCode)
        }
      }).catch(console.log)
    })
  }
