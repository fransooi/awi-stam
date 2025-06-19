/** --------------------------------------------------------------------------  
*   ______ _______ _______ _______   _ 
*  / _____|_______|_______|_______) | |   
* ( (____     _    _______ _  _  _  | |
*  \____ \   | |  |  ___  | ||_|| | |_|
*  _____) )  | |  | |   | | |   | |  _
* (______/   |_|  |_|   |_|_|   |_| |_|   The Multi-Editor
*
* This file is open-source under the conditions contained in the
* license file located at the root of this project.
*
* ----------------------------------------------------------------------------
* @file ResourceManager.js
* @author FL (Francois Lionet)
* @version 0.5
*
* @short This component manages the project
* @description
* Handling of all loading / saving of resources, images, sounds, videos.
*/
import BaseComponent from '../utils/BaseComponent.js';

export const RESOURCEMESSAGES = {
};

class ResourceManager extends BaseComponent {
  /**
   * Constructor
   * @param {string} parentId - ID of the parent component
   */
  constructor(parentId = null,containerId) {
    super('Resource', parentId,containerId);      
    this.resourceFolder = '/resources';
    this.resourceMap =  {};
    this.resourceCount = 0;
    var frameRate = 3;
    this.runningAnimations = {};
    this.animations = {
      connection: {
        images: 'connection',
        width: 384,
        height: 64,
        timeout: 1000/frameRate,
        loop: -1,
        steps: {
          start: [ { image: 1 } ],
          successServer: [ { image: 2 } ],
          successAwi: [ { image: 3 } ],
          error: [ { image: 0 } ],
          loop1: [ { image: 4 }, { image: 5 }, { image: 6 }, { image: 5 }  ],
          loop2: [ { image: 7 }, { image: 8 }, { image: 9 }, { image: 8 } ],
        }
      }
    }
    this.images = {
      'connection': [ 
        'none.png',
        'connected-stam.png',
        'connected-server.png',
        'connected-awi.png',
        'loop1-1.png',
        'loop1-2.png',
        'loop1-3.png',
        'loop2-1.png',
        'loop2-2.png',
        'loop2-3.png',
      ]
    };
  }

  async init(options = {}) {
    await super.init(options);
    await this.loadImages(options);
  }
  
  async destroy() {
    await super.destroy();
  }
  
  getInformation()
  {
    return {};
  }
  findResource( path ) {
    return this.resourceMap[path];
  }

  async loadImages()
  {
    for ( var i in this.images )
      await this.loadListOfImages(i, this.images[i]);
  }
  initAnimation(animationName, stepName, drawCallback)
  {
    var animation = this.animations[ animationName ];
    if (!animation )
      return false;
    var images = this.images[ animation.images ];
    if (!images)
      return false;
    var steps = animation.steps[ stepName ];
    if (!steps)
      return false;
    if (this.runningAnimations[animationName]){
      this.stopAnimation(animationName);
      this.runningAnimations[animationName] = {};
    }
    var runAnimation = {
      position: 0,
      loop: animation.loop,
      animation: animation,
      steps: animation.steps[ stepName ],
      images: images,
      timeout: animation.timeout || 100,
      drawCallback: drawCallback,
      timeoutId: null,
    }
    this.runningAnimations[animationName] = runAnimation;    
    this.runAnimation(animationName, runAnimation.timeout );
    return true;
  }
  runAnimation(runAnimationName, timeout)
  {
    var currentAnimation = this.runningAnimations[ runAnimationName ];
    if (!currentAnimation)
      return -1;
    if (currentAnimation.stopped)
      return currentAnimation.position;
    currentAnimation.position++;
    if (currentAnimation.position >= currentAnimation.steps.length)
    {
      currentAnimation.animation.loop--;
      if (currentAnimation.animation.loop == 0)
      {
        currentAnimation.stopped = true;
        return currentAnimation.position;
      }
      currentAnimation.position = 0;      
    }
    if (currentAnimation.drawCallback)
    {
      var imageName = currentAnimation.images[ currentAnimation.steps[ currentAnimation.position ].image ];
      var imagePath = currentAnimation.animation.images + '/' + imageName;
      currentAnimation.drawCallback(currentAnimation.position, this.resourceMap[imagePath]);
    }      
    if (currentAnimation.timeoutId)
      clearTimeout(currentAnimation.timeoutId);
    var self = this;
    timeout = timeout || currentAnimation.timeout;
    currentAnimation.timeoutId = setTimeout( () => {
      currentAnimation.timeoutId = null;
      self.runAnimation(runAnimationName, timeout);
    }, timeout );
    return currentAnimation.position;
  }
  stopAnimation(runAnimationName)
  {
    var currentAnimation = this.runningAnimations[ runAnimationName ];
    if (!currentAnimation)
      return false;
    currentAnimation.stopped = true;
    return true;
  }
  startAnimation(runAnimationName)
  {
    var currentAnimation = this.runningAnimations[ runAnimationName ];
    if (!currentAnimation)
      return false;
    currentAnimation.stopped = false;
    this.runAnimation(runAnimationName);
    return true;
  }
  getAnimationImage(runAnimationName)
  {
    var currentAnimation = this.runningAnimations[ runAnimationName ];
    if (!currentAnimation)
      return null;
    var imageName = currentAnimation.images[ currentAnimation.steps[ currentAnimation.position ].image ];
    var imagePath = currentAnimation.animation.images + '/' + imageName;
    return this.resourceMap[ imagePath ];
  }
  
  async loadImages( options = {} ) {
   for ( var i in this.images ) 
    await this.loadListOfImages(i, this.images[i]);
  }
  async getImage( name ) {
    return this.resourceMap[name];
  }
  loadListOfImages( collection, imageNames = [] ) {
    var toLoad = [];    
    var images = {};
    for ( var i = 0; i < imageNames.length; i++ )
    {
      var imagePath = collection + '/' + imageNames[i];
      var alreadyLoaded = this.findResource(imagePath) ;
      if ( alreadyLoaded )
        images[imagePath] = alreadyLoaded;
      else
        toLoad.push(imageNames[i]);
    }
    if (toLoad.length == 0)
      return new Promise( resolve => resolve(images) );
    return new Promise( resolve => {
      var count = 0;
      for ( var i = 0; i < toLoad.length; i++ )
      {
        var image = new Image();
        image.dataset.path = collection + '/' + toLoad[i];
        if ( toLoad[i].startsWith('http') )
          image.src = toLoad[i];
        else
          image.src = this.resourceFolder + '/images/' + collection + '/' + toLoad[i];
        image.onload = (event) => {
          var imagePath = event.srcElement.dataset.path;
          this.resourceMap[imagePath] = {
            type: 'image',
            name: toLoad[i],
            path: imagePath,
            data: event.srcElement,
          };
          images[imagePath] = this.resourceMap[imagePath];
          count++;
          if ( count === toLoad.length )
            resolve(images);
        };
        image.onerror = (error) => {
          console.error('Image load error:', error);
          var imagePath = collection + '/' + toLoad[i];
          images[imagePath] = null;
          count++;
          if ( count === toLoad.length )
            resolve(images);
        };
      }
    });
  }

}

export default ResourceManager;
 