onload = function(){
  // canvasエレメントを取得
  var c = document.getElementById('canvas');
  c.width = 500;
  c.height = 300;
  
  // webglコンテキストを取得
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
  
  // 頂点シェーダーとフラグメントシェーダの生成
  var v_shader = create_shader('vs');
  var f_shader = create_shader('fs');
  
  // プログラムオブジェクトの生成とリンク
  var prg_obj = create_prg_obj(v_shader, f_shader);
  
  // attributeLocationの取得
  var attLocation = new Array(2);
  attLocation[0] = gl.getAttribLocation(prg_obj, 'position');
  attLocation[1] = gl.getAttribLocation(prg_obj, 'color');
  
  // attributeの要素数
  var attStride = new Array(2);
  attStride[0] = 3; // xyzの3つ
  attStride[1] = 4; // RGBAの4つ
  
  // 頂点の位置データ
  var vertex_position = [
    0.0, 1.0, 0.0,
    1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
    0.0, -1.0, 0.0
  ];
  
  // 頂点の色データ
  var vertex_color = [
    1.0, 0.0, 0.0, 0.5,
    0.0, 1.0, 0.0, 0.5,
    0.0, 0.0, 1.0, 0.5,
    1.0, 1.0, 1.0, 0.5
  ]
  
  // 頂点のインデックス
  var index = [
    0, 1, 2,
    1, 2, 3
  ]
  
  // VBOの生成
  var vbo = new Array(2);
  vbo[0] = create_vbo(vertex_position);
  vbo[1] = create_vbo(vertex_color);
  
  // VBOをバインドし、登録する
  set_attribute(vbo, attLocation, attStride);
  
  // IBOの生成
  var ibo = create_ibo(index);
  
  // IBOをバインドして登録する
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  
  // uniformLocationの取得
  var uniLocation = gl.getUniformLocation(prg_obj, 'mvpMatrix');
  
  // matIVオブジェクトを生成（minMatrix.jsより）
  var m = new matIV();
  
  // 各種行列の生成と初期化
  var mMatrix = m.identity(m.create()); // モデル座標変換行列
  var vMatrix = m.identity(m.create()); // ビュー座標変換行列
  var pMatrix = m.identity(m.create()); // プロジェクション座標変換行列
  var vpMatrix = m.identity(m.create()); // p x v行列（座標変換行列）
  var mvpMatrix = m.identity(m.create()); // p x v x m行列（座標変換行列）
  
  // p x v行列定義
  m.lookAt([0.0, 0.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
  m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
  m.multiply(pMatrix, vMatrix, vpMatrix);
  
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
    
    // ラジアン算出のためカウンタをインクリメントしておく
    count++;
    count %= 360;
    
    // カウンタを元にラジアンを算出
    var rad = count * Math.PI / 180;
    
    // モデル座標変換行列を生成 Y軸による回転
    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
    m.multiply(vpMatrix, mMatrix, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
    
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
  function create_shader(id){
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
   * @return {} prg_obj 生成・リンク済のプログラムオブジェクト
   */
  function create_prg_obj(vs, fs){
    // プログラムオブジェクトの生成
    var prg_obj = gl.createProgram();
    
    // プログラムオブジェクトにシェーダを割り当てる
    gl.attachShader(prg_obj, vs);
    gl.attachShader(prg_obj, fs);
    
    // シェーダをリンク
    gl.linkProgram(prg_obj);
    
    // シェーダのリンクが正しく行われたかチェック
    if(gl.getProgramParameter(prg_obj, gl.LINK_STATUS)){
      gl.useProgram(prg_obj);
      return prg_obj
    }else{
      alert(gl.getProgramInfoLog(prg_obj));
    }
  }
  
  /**
   * VBO(Vertex Buffer Object)を生成する関数
   * @param {} data VBOにセットするデータ
   * @return {} vbo 生成したVBO
   */
   function create_vbo(data){
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
   function set_attribute(vbo, attL, attS){
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
    function create_ibo(data){
      var ibo = gl.createBuffer();
      
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
      
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      
      return ibo;
    }
};