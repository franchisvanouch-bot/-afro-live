const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,Number(value)||0));

/**
 * Local person segmentation and background-only blur.
 * MediaPipe returns a two-class mask: 0 background, 1 person.
 */
export class AfroBackgroundBlur {
  constructor(){
    this.segmenter=null;
    this.loading=null;
    this.mask=null;
    this.maskWidth=0;
    this.maskHeight=0;
    this.lastSegmentAt=0;
    this.lastVideoTime=-1;
    this.lastSize="";
    this.output=document.createElement("canvas");
    this.maskSource=document.createElement("canvas");
    this.maskSoft=document.createElement("canvas");
    this.maskData=null;
    this.foreground=document.createElement("canvas");
    this.outputCtx=this.output.getContext("2d",{alpha:false,desynchronized:true});
    this.maskSourceCtx=this.maskSource.getContext("2d");
    this.maskSoftCtx=this.maskSoft.getContext("2d");
    this.foregroundCtx=this.foreground.getContext("2d");
    this.failed=false;
  }

  async init(){
    if(this.segmenter)return true;
    if(this.loading)return this.loading;
    this.loading=(async()=>{
      try{
        const vision=window.vision;
        if(!vision?.ImageSegmenter||!vision?.FilesetResolver)throw new Error("MediaPipe ImageSegmenter unavailable");
        const files=await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
        const model="https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite";
        const options={
          baseOptions:{modelAssetPath:model,delegate:"GPU"},
          runningMode:"VIDEO",
          outputCategoryMask:false,
          outputConfidenceMasks:true
        };
        try{
          this.segmenter=await vision.ImageSegmenter.createFromOptions(files,options);
        }catch(gpuError){
          console.warn("AFRO LIVE segmentation GPU unavailable; retrying CPU",gpuError);
          options.baseOptions.delegate="CPU";
          this.segmenter=await vision.ImageSegmenter.createFromOptions(files,options);
        }
        return true;
      }catch(error){
        console.warn("AFRO LIVE background segmentation unavailable",error);
        this.failed=true;
        this.loading=null;
        return false;
      }
    })();
    return this.loading;
  }

  _resize(width,height){
    const size=width+"x"+height;
    if(size===this.lastSize)return;
    this.lastSize=size;
    for(const canvas of [this.output,this.maskSoft,this.foreground]){
      canvas.width=width;canvas.height=height;
    }
  }

  _acceptResult(result){
    const masks=result?.confidenceMasks;
    const person=masks?.[1];
    if(!person)return;
    const data=person.getAsFloat32Array();
    if(!data?.length)return;
    this.mask=new Float32Array(data);
    this.maskWidth=person.width;
    this.maskHeight=person.height;
    if(this.maskSource.width!==this.maskWidth||this.maskSource.height!==this.maskHeight){
      this.maskSource.width=this.maskWidth;this.maskSource.height=this.maskHeight;
    }
    this.maskData=this.maskSourceCtx.createImageData(this.maskWidth,this.maskHeight);
  }

  update(video,blurAmount=0){
    const amount=clamp(blurAmount);
    if(!video||video.readyState<2||!video.videoWidth||!video.videoHeight)return video;
    if(amount<=0||this.failed)return video;
    this._resize(video.videoWidth,video.videoHeight);
    if(!this.segmenter){
      this.init();
      return video;
    }

    const now=performance.now();
    if(video.currentTime!==this.lastVideoTime&&now-this.lastSegmentAt>=115){
      this.lastVideoTime=video.currentTime;
      this.lastSegmentAt=now;
      try{
        this.segmenter.segmentForVideo(video,now,result=>this._acceptResult(result));
      }catch(error){
        console.warn("AFRO LIVE segmentation frame failed",error);
      }
    }
    if(!this.mask||!this.maskWidth||!this.maskHeight)return video;

    const mw=this.maskWidth,mh=this.maskHeight;
    const image=this.maskData||this.maskSourceCtx.createImageData(mw,mh);
    const data=image.data;
    for(let i=0;i<this.mask.length;i++){
      const alpha=Math.round(clamp(this.mask[i]*100)/100*255);
      const j=i*4;
      data[j]=255;data[j+1]=255;data[j+2]=255;data[j+3]=alpha;
    }
    this.maskSourceCtx.putImageData(image,0,0);
    this.maskSoftCtx.clearRect(0,0,this.output.width,this.output.height);
    this.maskSoftCtx.save();
    this.maskSoftCtx.filter="blur("+Math.max(2,this.output.width/360)+"px)";
    this.maskSoftCtx.drawImage(this.maskSource,0,0,this.output.width,this.output.height);
    this.maskSoftCtx.restore();

    const ctx=this.outputCtx;
    ctx.save();
    ctx.clearRect(0,0,this.output.width,this.output.height);
    const blurPx=(this.output.width/720)*(2+amount*.22);
    ctx.filter="blur("+blurPx+"px)";
    ctx.drawImage(video,0,0,this.output.width,this.output.height);
    ctx.filter="none";
    this.foregroundCtx.clearRect(0,0,this.foreground.width,this.foreground.height);
    this.foregroundCtx.drawImage(video,0,0,this.foreground.width,this.foreground.height);
    this.foregroundCtx.globalCompositeOperation="destination-in";
    this.foregroundCtx.drawImage(this.maskSoft,0,0);
    this.foregroundCtx.globalCompositeOperation="source-over";
    ctx.drawImage(this.foreground,0,0);
    ctx.restore();
    return this.output;
  }

  close(){
    try{this.segmenter?.close()}catch{}
    this.segmenter=null;this.mask=null;
  }
}
