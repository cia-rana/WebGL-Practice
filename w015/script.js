﻿onload = function(){
  // canvasエレメントを取得
  var c = document.getElementById('canvas');
  c.width = 500;
  c.height = 300;
  
  // webglコンテキストを取得
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
  
  // canvasを初期化する色を設定する
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  
  // canvasを初期化する際の深度を設定する
  gl.clearDepth(1.0);
  
  // canvasを初期化する
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
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
  attStride[0] = 3;
  attStride[1] = 4;
  
  // 頂点の位置データ
  var vertex_position = [
    0.0, 1.0, 0.0,
    1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0
  ];
  
  // 頂点の色データ
  var vertex_color = [
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 1.0,
  ]
  
  // VBOの生成
  var vbo_position = create_vbo(vertex_position);
  var vbo_color = create_vbo(vertex_color);
  
  // 頂点の位置情報のVBOをバインド
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo_position);
  gl.enableVertexAttribArray(attLocation[0]);
  gl.vertexAttribPointer(attLocation[0], attStride[0], gl.FLOAT, false, 0, 0);
  
  // 頂点の色情報のVBOをバインド
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo_color);
  gl.enableVertexAttribArray(attLocation[1]);
  gl.vertexAttribPointer(attLocation[1], attStride[1], gl.FLOAT, false, 0, 0);
  
  // matIVオブジェクトを生成（minMatrix.jsより）
  var m = new matIV();
  
  // 各種行列の生成と初期化
  var mMatrix = m.identity(m.create()); // モデル座標変換行列
  var vMatrix = m.identity(m.create()); // ビュー座標変換行列
  var pMatrix = m.identity(m.create()); // プロジェクション座標変換行列
  var mvpMatrix = m.identity(m.create()); // 上記3行列の積行列（座標変換行列）
  
  // ビュー座標変換行列を定義
  m.lookAt([0.0, 1.0, 3.0], [0, 0, 0], [0, 1, 0], vMatrix);
  
  // プロジェクション座標変換行列を定義
  m.perspective(90, c.width / c.height, 0.1, 100, pMatrix);
  
  // mvp行列を定義
  m.multiply(pMatrix, vMatrix, mvpMatrix);
  m.multiply(mvpMatrix, mMatrix, mvpMatrix);
  
  // uniformLocationの取得
  var uniLocation = gl.getUniformLocation(prg_obj, 'mvpMatrix');
  
  // uniformLocationへmvp行列を登録
  gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
  
  // モデルの描画
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  
  // コンテキストの描画
  gl.flush();
  
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
};