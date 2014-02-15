/*
*An audio spectrum visualizer built with HTML5 Audio API
*Author:Wayou
*License:feel free to use but keep this info please!
*Feb 15 2014
*Need support you can :
*view the project page:https://github.com/Wayou/HTML5_Audio_Visualizer/
*view online demo:http://wayouliu.duapp.com/mess/audio_visualizer.html
*or contact me:liuwayong@gmail.com
*/

window.onload = function() {
    new Visualizer().ini();
};
var Visualizer = function() {
    this.file = null, //the current file
    this.fileName = null, //the current file name
    this.audioContext = null,
    this.source = null, //the audio source
    this.info = document.getElementById('info').innerHTML, //this used to upgrade the UI information
    this.infoUpdateId = null //to sotore the setTimeout ID and clear the interval
};
Visualizer.prototype = {
    ini: function() {
        this._prepareAPI();
        this._addEventListner();
    },
    _prepareAPI: function() {
        //fix browser vender for AudioContext and requestAnimationFrame
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        try {
            this.audioContext = new AudioContext();
        } catch (e) {
            that._updateInfo('!Your browser does not support AudioContext', false);
            console.log(e);
        }
    },
    _addEventListner: function() {
        var that = this,
            audioInput = document.getElementById('uploadedFile'),
            dropContainer = document.getElementsByTagName("canvas")[0];
        //listen the file upload
        audioInput.onchange = function() {
            //the if statement fixes the file selction cancle, because the onchange will trigger even the file selection been canceled
            if (audioInput.files.length !== 0) {
                //only process the first file
                that.file = audioInput.files[0];
                that.fileName = that.file.name;
                //once the file is ready,start the visualizer
                that._start();
                that._updateInfo('Uploading', true);
            };
        };
        //listen the drag & drop
        dropContainer.addEventListener("dragenter", function() {
            that._updateInfo('Drop it on the page', true);
        }, false);
        dropContainer.addEventListener("dragover", function(e) {
            e.stopPropagation();
            e.preventDefault();
            //set the drop mode
            e.dataTransfer.dropEffect = 'copy';
        }, false);
        dropContainer.addEventListener("dragleave", function() {
            that._updateInfo(that.info, false);
        }, false);
        dropContainer.addEventListener("drop", function(e) {
            e.stopPropagation();
            e.preventDefault();
            that._updateInfo('Uploading', true);
            //get the dropped file
            that.file = e.dataTransfer.files[0];
            that.fileName = that.file.name;
            //once the file is ready,start the visualizer
            that._start();
        }, false);
    },
    _start: function() {
        //read and decode the file into audio array buffer 
        var that = this,
            file = this.file,
            fr = new FileReader();
        fr.onload = function(e) {
            var fileResult = e.target.result;
            var audioContext = that.audioContext;
            if (audioContext === null) {
                return
            };
            that._updateInfo('Decoding the audio', true);
            audioContext.decodeAudioData(fileResult, function(buffer) {
                that._updateInfo('Decode succussfully,start the visualizer', true);
                that._visualize(audioContext, buffer);
            }, function(e) {
                that._updateInfo('!Fail to decode the file', false);
                console.log(e);
            });
        };
        fr.onerror = function(e) {
            that._updateInfo('!Fail to read the file', false);
            console.log(e);
        };
        //assign the file to the reader
        this._updateInfo('Starting read the file', true);
        fr.readAsArrayBuffer(file);
    },
    _visualize: function(audioContext, buffer) {
        var audioBufferSouceNode = audioContext.createBufferSource(),
            analyser = audioContext.createAnalyser();
        //connect the source to the analyser
        audioBufferSouceNode.connect(analyser);
        //connect the analyser to the destination(the speaker), or we won't hear the sound
        analyser.connect(audioContext.destination);
        //then assign the buffer to the buffer source node
        audioBufferSouceNode.buffer = buffer;
        //play the source
        if (!audioBufferSouceNode.start) {
            audioBufferSouceNode.start = audioBufferSouceNode.noteOn //in old browsers use noteOn method
            audioBufferSouceNode.stop = audioBufferSouceNode.noteOff //in old browsers use noteOn method
        };
        audioBufferSouceNode.start(0);
        audioBufferSouceNode.onended = this._audioEnd; //in case a song is ended the spectrum is not zero
        //stop the previous sound if any
        if (this.source !== null) this.source.stop(0);
        this.source = audioBufferSouceNode;
        this._updateInfo('Playing ' + this.fileName, false);
        this.info = 'Playing ' + this.fileName;
        document.getElementById('fileWrapper').style.opacity = 0.2;
        this._drawSpectrum(analyser);
    },
    _drawSpectrum: function(analyser) {
        var canvas = document.getElementById('canvas'),
            cwidth = canvas.width,
            cheight = canvas.height - 2,
            meterWidth = 10, //width of the meters in the spectrum
            gap = 2, //gap between meters
            capHeight = 2,
            capStyle = '#fff',
            meterNum = 800 / (10 + 2), //count of the meters
            capYPositionArray = []; ////store the vertical position of hte caps for the preivous frame
        ctx = canvas.getContext('2d'),
        gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(1, '#0f0');
        gradient.addColorStop(0.5, '#ff0');
        gradient.addColorStop(0, '#f00');
        var drawMeter = function() {
            var array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            var step = Math.round(array.length / meterNum); //sample limited data from the total array
            ctx.clearRect(0, 0, cwidth, cheight);
            for (var i = 0; i < meterNum; i++) {
                var value = array[i * step];
                if (capYPositionArray.length < Math.round(meterNum)) {
                    capYPositionArray.push(value);
                };
                ctx.fillStyle = capStyle;
                //draw the cap, with transition effect
                if (value < capYPositionArray[i]) {
                    ctx.fillRect(i * 12, cheight - (--capYPositionArray[i]), meterWidth, capHeight);
                } else {
                    ctx.fillRect(i * 12, cheight - value, meterWidth, capHeight);
                    capYPositionArray[i] = value;
                };
                //normal cap
                // ctx.fillStyle = capStyle;
                // ctx.fillRect(i * 12, cheight - value, meterWidth, capHeight);
                //draw the meter
                ctx.fillStyle = gradient; //set the filllStyle to gradient for a better look
                ctx.fillRect(i * 12 /*meterWidth+gap*/ , cheight - value + capHeight  /*2 is the gap between meter and cap*/ , meterWidth, cheight); //the meter
            }
            requestAnimationFrame(drawMeter);
        }
        requestAnimationFrame(drawMeter);
    },
    _audioEnd: function() {
        console.log('audio ended');
        var canvas = document.getElementById('canvas'),
            cwidth = canvas.width,
            cheight = canvas.height,
            ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, cwidth, cheight);
        document.getElementById('fileWrapper').style.opacity = 1;
    },
    _updateInfo: function(text, processing) {
        var infoBar = document.getElementById('info'),
            dots = '...',
            i = 0,
            that = this;
        infoBar.innerHTML = text + dots.substring(0, i++);
        if (this.infoUpdateId !== null) {
            clearTimeout(this.infoUpdateId);
        };
        if (processing) {
            //animate dots at the end of the info text
            var animateDot = function() {
                if (i > 3) {
                    i = 0
                };
                infoBar.innerHTML = text + dots.substring(0, i++);
                that.infoUpdateId = setTimeout(animateDot, 250);
            }
            this.infoUpdateId = setTimeout(animateDot, 250);
        };
    }
}