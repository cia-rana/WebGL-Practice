onload = function(){
  // canvasエレメントを取得
  var c = document.getElementById('canvas');
  c.width = 500;
  c.height = 300;
  
  // webglコンテキストを取得
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
  
  // 頂点シェーダーとフラグメントシェーダの生成
  var vShader = createShader('vs');
  var fShader = createShader('fs');
  
  // プログラムオブジェクトの生成とリンク
  var prgObj = createPrgObj(vShader, fShader);
  
  // attributeLocationの取得
  var attLocation = new Array(2);
  attLocation[0] = gl.getAttribLocation(prgObj, 'position');
  attLocation[1] = gl.getAttribLocation(prgObj, 'color');
  attLocation[2] = gl.getAttribLocation(prgObj, 'textureCoord');
  
  // attributeの要素数
  var attStride = new Array(2);
  attStride[0] = 3; // xyzの3つ
  attStride[1] = 4; // RGBAの4つ
  attStride[2] = 2; // テクスチャの縦横の2つ
  
  // 頂点の位置データ
  var vertexPosition = [
    -1.0, 1.0, 0.0,
    1.0, 1.0, 0.0,
    -1.0, -1.0, 0.0,
    1.0, -1.0, 0.0
  ];
  
  // 頂点の色データ
  var vertexColor = [
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, 1.0, 1.0, 1.0
  ]
  
  // テクスチャ座標
  var textureCoord = [
    0.0, 0.0,
    1.0, 0.0,
    0.0, 1.0,
    1.0, 1.0,
  ]
  
  // 頂点のインデックス
  var index = [
    0, 1, 2,
    3, 2, 1
  ]
  
  // VBOの生成
  vboPosition = createVbo(vertexPosition);
  vboColor = createVbo(vertexColor);
  vboTextureCoord = createVbo(textureCoord);
  vboList = [vboPosition, vboColor];
  
  // VBOをバインドし、登録する
  setAttribute(vboList, attLocation, attStride);
  
  // IBOの生成
  var ibo = createIbo(index);
  
  // IBOをバインドして登録する
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  
  // uniformLocationの取得
  var uniLocation = new Array();
  uniLocation[0] = gl.getUniformLocation(prgObj, 'mvpMatrix');
  uniLocation[1] = gl.getUniformLocation(prgObj, 'texture');
  
  // matIVオブジェクトを生成（minMatrix.jsより）
  var m = new matIV();
  
  // 各種行列の生成と初期化
  var mMatrix = m.identity(m.create()); // モデル座標変換行列
  var vMatrix = m.identity(m.create()); // ビュー座標変換行列
  var pMatrix = m.identity(m.create()); // プロジェクション座標変換行列
  var vpMatrix = m.identity(m.create()); // p x v行列（座標変換行列）
  var mvpMatrix = m.identity(m.create()); // p x v x m行列（座標変換行列）
  
  // p x v行列定義
  m.lookAt([0.0, 2.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
  m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
  m.multiply(pMatrix, vMatrix, vpMatrix);
  
  // 深度テストを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  
  // 有効にするテクスチャユニットを指定
  gl.activeTexture(gl.TEXTURE0);
  
  // テクスチャ用変数の宣言
  var texture = null;
  
  // テクスチャを生成
  createTexture('../img/texture.png');
  
  // カウンタの宣言
  var count = 0;
  
  // 恒常ループ
  (function(){
    // canvasを初期化する色を設定する
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // canvasを初期化する際の深度を設定する
    gl.clearDepth(1.0);
    
    // canvasを初期化する
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // カウンタを元にラジアンを算出
    count++;
    count %= 360;
    var rad = count * Math.PI / 180;
    
    // テクスチャをバインドする
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // uniform変数にテクスチャを登録
    gl.uniform1i(uniLocation[1], 0);
    
    // モデル座標変換行列を生成 Y軸による回転
    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
    m.multiply(vpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    
    // インデックスを用いたモデルの描画
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
    
    // コンテキストの描画
    gl.flush();
    
    // ループのために再帰呼び出し(1000/30 msecごとにループ)
    setTimeout(arguments.callee, 1000 / 30);
  })();
  
  /** 
   * シェーダを生成・コンパイルする関数
   * @param {string} id HTMLからscriptタグへ参照するためのID
   * @return {} 作成・コンパイル済のシェーダ
   */
  function createShader(id){
    // シェーダを格納する変数
    var shader;
    
    // HTMLからscriptタグへの参照を取得
    var scriptElement = document.getElementById(id);
    
    // scriptタグが存在しない場合は抜ける
    if(!scriptElement){ return; }
    
    // scriptタグのtype属性をチェック
    switch(scriptElement.type){
      
      // 頂点シェーダの場合
      case 'x-shader/x-vertex':
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;
        
      // フラグメントシェーダの場合
      case 'x-shader/x-fragment':
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
      default:
        return;
    }
    
    // 生成されたシェーダにソースを割り当てる
    gl.shaderSource(shader, scriptElement.text);
    
    // シェーダをコンパイルする
    gl.compileShader(shader);
    
    // シェーダが正しくコンパイルされたかチェック
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
      return shader;
    }else{
      alert(gl.getShaderInfoLog(shader));
    }
  }
  
  /**
   * プログラムオブジェクトの生成とシェーダのリンクを行う関数
   * @param {} vs 頂点シェーダ
   * @param {} fs フラグメントシェーダ
   * @return {} prgObj 生成・リンク済のプログラムオブジェクト
   */
  function createPrgObj(vs, fs){
    // プログラムオブジェクトの生成
    var prgObj = gl.createProgram();
    
    // プログラムオブジェクトにシェーダを割り当てる
    gl.attachShader(prgObj, vs);
    gl.attachShader(prgObj, fs);
    
    // シェーダをリンク
    gl.linkProgram(prgObj);
    
    // シェーダのリンクが正しく行われたかチェック
    if(gl.getProgramParameter(prgObj, gl.LINK_STATUS)){
      gl.useProgram(prgObj);
      return prgObj
    }else{
      alert(gl.getProgramInfoLog(prgObj));
    }
  }
  
  /**
   * VBO(Vertex Buffer Object)を生成する関数
   * @param {} data VBOにセットするデータ
   * @return {} vbo 生成したVBO
   */
   function createVbo(data){
     // バッファオブジェクトの生成
     var vbo = gl.createBuffer();
     
     // バッファをバインドする
     gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
     
     // バッファにデータをセットする
     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
     
     // バッファのバインドを無効化
     gl.bindBuffer(gl.ARRAY_BUFFER, null);
     
     return vbo;
   }
   
   /**
    * VBOをバインドし、登録する関数
    * @param {} vbo VBOの配列
    * @param {} attL attributeLocationの配列
    * @param {int} attS attributeの要素数の配列
    */
   function setAttribute(vbo, attL, attS){
     for(var i in vbo){
       gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
       gl.enableVertexAttribArray(attLocation[i]);
       gl.vertexAttribPointer(attLocation[i], attStride[i], gl.FLOAT, false, 0, 0);
     }
   }
   
   /**
    * IBO(Index Buffer Object)を生成する関数
    * @param {} data IBOにセットするデータ
    * @retrun {} ibo 生成したIBO
    */
    function createIbo(data){
      var ibo = gl.createBuffer();
      
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
      
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      
      return ibo;
    }
    
    /**
     * テクスチャを生成する関数
     * @param {String} source 画像リソースのパス
     */
     function createTexture(source){
       var img = new Image();
       
       // データのオンロードをトリガーにする
       img.onload = function(){
         var tex = gl.createTexture();
         
         // テクスチャをバインド
         gl.bindTexture(gl.TEXTURE_2D, tex);
         
         // テクスチャへイメージを適用
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNISIGNED_BYTE, img);
         
         // ミニマップを生成
         gl.generateMipmap(gl.TEXTURE_2D);
         
         // テクスチャのバインドを無効化
         gl.bindTexture(gl.TEXTURE_2D, null);
         
         // 生成したテクスチャをグローバル変数に代入
         texture = tex;
       };
       
       img.src = source;
     }
};