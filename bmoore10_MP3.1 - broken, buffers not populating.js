
var gl;
var canvas;

var shaderProgram;

// Create a place to store the texture coords for the mesh
var cubeTCoordBuffer;

// Create a place to store terrain geometry
var cubeVertexBuffer;

// Create a place to store the triangles
var cubeTriIndexBuffer;

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

//Create the normal
var nMatrix = mat3.create();

var mvMatrixStack = [];

//Create a place to store teapot geometry
var teapotVertexBuffer;

//Create a place to store teapot's traingles
var teapotFaceBuffer;

// Create a place to store the texture

var cubeImage;
var cubeTexture;

// For animation
var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);

/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}

/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
 * Sends material information to the shader
 * @param {Float32Array} a diffuse material color
 * @param {Float32Array} a ambient material color
 * @param {Float32Array} a specular material color
 * @param {Float32} the shininess exponent for Phong illumination
 */
function uploadMaterialToShader(dcolor, acolor, scolor,shiny) {
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColor, dcolor);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColor, acolor);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColor, scolor);

  gl.uniform1f(shaderProgram.uniformShininess, shiny);
}

/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadProjectionMatrixToShader();
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }

  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

/**
 * Setup the fragment and vertex shaders for the cube
 */
function setupCubeShader() {
  vertexShader = loadShaderFromDOM("cubeShader-vs");
  fragmentShader = loadShaderFromDOM("cubeShader-fs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.texCoordAttribute = gl.getAttribLocation(shaderProgram, "aTexCoord");
  gl.enableVertexAttribArray(shaderProgram.texCoordAttribute);

  shaderProgram.aFaceAttribute = gl.getAttribLocation(shaderProgram, "aFace");
  gl.enableVertexAttribArray(shaderProgram.aFaceAttribute);

  shaderProgram.up = gl.getUniformLocation(shaderProgram, "top");
  shaderProgram.left = gl.getUniformLocation(shaderProgram, "left");
  shaderProgram.down = gl.getUniformLocation(shaderProgram, "bottom");
  shaderProgram.right = gl.getUniformLocation(shaderProgram, "right");
  shaderProgram.front = gl.getUniformLocation(shaderProgram, "front");
  shaderProgram.back = gl.getUniformLocation(shaderProgram, "back");

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
}
var aFaceAttributeBuffer;
/**
 * Draw a cube based on buffers.
 */
function drawCube(){

  // Draw the cube by binding the array buffer to the cube's vertices
  // array, setting attributes, and pushing it to GL.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

  // Set the texture coordinates attribute for the vertices.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

  //bind lookup buffers
  gl.bindBuffer(gl.ARRAY_BUFFER, aFaceAttributeBuffer);
  gl.vertexAttribPointer(shaderProgram.aFaceAttribute, aFaceAttributeBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Specify the texture to map onto the faces.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, rightTexture);
  gl.uniform1i(shaderProgram.right, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, upTexture);
  gl.uniform1i(shaderProgram.up, 1);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, backTexture);
  gl.uniform1i(shaderProgram.back, 2);

  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, leftTexture);
  gl.uniform1i(shaderProgram.left, 3);

  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, downTexture);
  gl.uniform1i(shaderProgram.down, 4);

  gl.activeTexture(gl.TEXTURE5);
  gl.bindTexture(gl.TEXTURE_2D, frontTexture);
  gl.uniform1i(shaderProgram.right, 5);

  // Draw the cube.

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}



/**
 * Draw the teapot based on buffers
 */
function drawTeapot(){
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotFaceBuffer);
    gl.drawElements(gl.TRIANGLES,  teapotFaceBuffer.numitems, gl.UNSIGNED_SHORT, 0);

}

//View parameters
var eyePt = vec3.fromValues(0.0, 0.0, -1.0);
var viewDir = vec3.fromValues(0.0, 0.0, -1.0);
var up = vec3.fromValues(0.0, 1.0, 0.0);
var  viewPt = vec3.fromValues(0.0, 0.0, 0.0);

//Create normal for teapot
var nTeapotMatrix = mat3.create();

/**
 * Setup the fragment and veretx shaders for the teapot
 */
function setupTeapotShader(){
    vertexShader = loadShaderFromDOM("teapotShader-vs");
    fragmentShader = loadShaderFromDOM("teapotShader-fs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Failed to setup shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "teapotVertices");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "teapotNormals");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");

    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    shaderProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
    shaderProgram.uniformAmbientMaterialColor = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
    shaderProgram.uniformSpecularMaterialColor = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");
    shaderProgram.uniformShininess = gl.getUniformLocation(shaderProgram, "uShininess");

}

/**
 * Draw call that applies matrix transformations to cube
 */
function draw() {
    var transformVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    /*

        Add stuff for phong shading here

    */

    //Draw the cube
    //setupCubeShader();
    //mvPushMatrix();
    //vec3.set(transformVec,0.0,0.0,-1.0);
    //mat4.translate(mvMatrix, mvMatrix,transformVec);
    //mat4.rotateX(mvMatrix,mvMatrix,modelXRotationRadians);
    //mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians);
    //setMatrixUniforms();
    //drawCube();
    //mvPopMatrix();


    //Draw the teapot
    setupTeapotShader();
    mvPushMatrix();
    vec3.set(transformVec, 0.0, 0.0, 0.0);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, modelXRotationRadians);
    mat4.rotateY(mvMatrix, mvMatrix, modelYRotationRadians);

    R=1.0; G=0.0; B=0.0; shiny=0.0;

    uploadLightsToShader([1,1,1],[0.0,0.0,0.0],[1.0,1.0,1.0],[1.0,1.0,1.0]);
    uploadMaterialToShader([R,G,B],[R,G,B],[1.0,1.0,1.0],shiny);

    setMatrixUniforms();
    uploadNormalMatrixToShader();

    drawTeapot();
    mvPopMatrix();

}

/**
 * Animation to be called from tick. Updates global rotation values.
 */
function animate() {
    if (then==0)
    {
        then = Date.now();
    }
    else
    {
        now=Date.now();
        // Convert to seconds
        now *= 0.001;
        // Subtract the previous time from the current time
        var deltaTime = now - then;
        // Remember the current time for the next frame.
        then = now;

        //Animate the rotation
        //modelXRotationRadians += 1.2 * deltaTime;
        modelYRotationRadians += 1.0 * deltaTime;
    }
}

/**
 * Creates texture for application to cube.
 */
function setupTextures() {
  cubeTexture = gl.createTexture();
 gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
// Fill the texture with a 1x1 blue pixel.
 gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 255, 255]));
}

/**
 * @param {number} value Value to determine whether it is a power of 2
 * @return {boolean} Boolean of whether value is a power of 2
 */
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

var teapotNormalBuffer;
/**
 * Sets up buffers for cube.
 */
/**
 * Populate buffers with data
 */
function setupBuffers() {

  // Create a buffer for the cube's vertices.

  cubeVertexBuffer = gl.createBuffer();

  // Select the cubeVerticesBuffer as the one to apply vertex
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);


  // Now create an array of vertices for the cube.
  var vertices = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0
  ];

  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  //Create a buffer for the teapot's vertices
  teapotVertexBuffer = gl.createBuffer();

  //Select the teapotVertexBuffer as the one to apply vertex operations to from here on out
  gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);

  //Now pass the list of vertices into webgl to build the shape.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotVertexArray), gl.STATIC_DRAW);


  //Build the element array buffer for the teapot
  teapotFaceBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotFaceBuffer);



  //Now send the element array to GL
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(teapotFaceArray), gl.STATIC_DRAW);
  teapotFaceBuffer.itemsize = 1;
  teapotFaceBuffer.numItems = ( (teapotFaceArray.legnth) / 3);


  //Create buffer for teapot's normals
  teapotNormalBuffer = gl.createBuffer();

  //Select normal buffer as one to apply operations to
  gl.bindBuffer(gl.ARRAY_BUFFER, teapotNormalBuffer);

  var testArray = [1,2];
  //Now pass the list of normals into webgl to build the shape
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotNormalArray), gl.STATIC_DRAW);


  // Map the texture onto the cube's faces.

  cubeTCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);

  var textureCoordinates = [
    // Front
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Back
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    0.0,  0.0,
    // Top
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    0.0,  0.0,
    // Bottom
    1.0,  1.0,
    0.0,  1.0,
    0.0,  0.0,
    1.0,  0.0,
    // Right
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    0.0,  0.0,
    // Left
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.

  cubeTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ]

  // Now send the element array to GL
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);


  //Populate the array for the face attribute to send to the shader
  aFaceAttributeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, aFaceAttributeBuffer);
  var texLookArray = [
     0.0, 0.0, 0.0, 0.0,
     1.0, 1.0, 1.0, 1.0,
     2.0, 2.0, 2.0, 2.0,
     3.0, 3.0, 3.0, 3.0,
     4.0, 4.0, 4.0, 4.0,
     5.0, 5.0, 5.0, 5.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texLookArray), gl.STATIC_DRAW);
  aFaceAttributeBuffer.itemSize = 1;
  aFaceAttributeBuffer.numItems = 24;
}

//Textures are out of order. Following are for when we're INSIDE the cube
//rightTexture = initial back
//backTexture = initial front
//leftTexture = intiial left (yay)
//ftonrTexture = initial right

var cubeMapTex;
var frontTexture;
var backTexture;
var upTexture;
var downTexture;
var rightTexture;
var leftTexture;
var p2good = 1;

function cubeTexSetup(){
    var posX = new Image();
    posX.onload = function(){
        rightTexture = createTextureFromImage(posX, shaderProgram.right);
    }
    posX.src = "resources/neg-z.png";

    var posY = new Image();
    posY.onload = function(){
        upTexture = createTextureFromImage(posY, shaderProgram.up);
    }
    posY.src = "resources/pos-y.png";

    var posZ = new Image();
    posZ.onload = function(){
        backTexture = createTextureFromImage(posZ, shaderProgram.back);
    }
    posZ.src = "resources/pos-z.png";

    var negX = new Image();
    negX.onload = function(){
        leftTexture = createTextureFromImage(negX, shaderProgram.left);
    }
    negX.src = "resources/pos-x.png";

    var negY = new Image();
    negY.onload = function(){
        downTexture = createTextureFromImage(negY, shaderProgram.down);
    }
    negY.src = "resources/neg-y.png";

    var negZ = new Image();
    negZ.onload = function(){
        frontTexture = createTextureFromImage(negZ, shaderProgram.front);
    }
    negZ.src = "resources/neg-x.png";

    if(p2good){
        console.log("All textures are power of 2");
    }else{
        console.log("One or more texture is not a power of 2. Please revise");
    }

}

function createTextureFromImage(image, uniform){
    var texture =  gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    if(isPowerOf2(image.width) ** isPowerOf2(image.height) ){
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    }else{
        p2good = 0;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;

}

var teapotVertexArray = [];
var teapotNormalArray = [];
var teapotFaceArray = [];



/**
 *  Function used to import the teapot and populate the arrays for its vertices / faces
 */
 function importTeaPot(teapotInfo){
     var teapotNoReturns = teapotInfo.replace(/\n/g, " ");
     var teapotReadyForParse = teapotNoReturns.split(" ");

     var vOri = 0;

     for(var i = 0; i < teapotReadyForParse.length; i++){
         if(teapotReadyForParse[i] == ""){
            //console.log("found a blank");
        }else if(teapotReadyForParse[i] == "v"){
            vOri = 0;
            //console.log("got a v");
        }else if(teapotReadyForParse[i] == "f"){
            vOri = 1;
            //console.log("got an f");
        }else{
            if(vOri == 0){
                teapotVertexArray.push(teapotReadyForParse[i]);
            }else{
                teapotFaceArray.push(teapotReadyForParse[i]);
            }

        }
     }

     //Teapot vertex and face arrays are now popualted according to the order in the original object file
     //Need to get teapotNormals
     for (var i = 0; i < teapotVertexArray.length; i++){
         teapotNormalArray[i] = 1;
     }



 }

/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  gl.clearColor(0.0, 1.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  readTextFile("resources/teapot_0.obj", importTeaPot);
  console.log("Teapot loaded");

  setupTextures();
  cubeTexSetup();
  setupBuffers();


  draw();
  tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}
