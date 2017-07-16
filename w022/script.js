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
  var attLocation = new Array(3);
  attLocation[0] = gl.getAttribLocation(prg_obj, 'position');
  attLocation[1] = gl.getAttribLocation(prg_obj, 'normal');
  attLocation[2] = gl.getAttribLocation(prg_obj, 'color');
  
  // attributeの要素数
  var attStride = new Array(3);
  attStride[0] = 3; // 頂点位置のxyzの3つ
  attStride[1] = 3; // 法線ベクトルのxyzの3つ
  attStride[2] = 4; // RGBAの4つ
  
  // トーラスの頂点データを生成
  var torus_data = create_torus(32, 32, 1.0, 2.0);
  var vertex_position = torus_data[0];
  var vertex_normal = torus_data[1];
  var vertex_color = torus_data[2];
  var vertex_index = torus_data[3];
  
  // VBOの生成
  var vbo = new Array(3);
  vbo[0] = create_vbo(vertex_position);
  vbo[1] = create_vbo(vertex_normal);
  vbo[2] = create_vbo(vertex_color);
  
  // VBOをバインドし、登録する
  set_attribute(vbo, attLocation, attStride);
  
  // IBOの生成
  var ibo = create_ibo(vertex_index);
  
  // IBOをバインドして登録する
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  
  // uniformLocationの取得
  var uniLocation = new Array(4);
  uniLocation[0] = gl.getUniformLocation(prg_obj, 'mvpMatrix');
  uniLocation[1] = gl.getUniformLocation(prg_obj, 'invMatrix');
  uniLocation[2] = gl.getUniformLocation(prg_obj, 'lightDirection');
  uniLocation[3] = gl.getUniformLocation(prg_obj, 'ambientColor');
  
  // matIVオブジェクトを生成（minMatrix.jsより）
  var m = new matIV();
  
  // 各種行列の生成と初期化
  var mMatrix = m.identity(m.create()); // モデル座標変換行列
  var vMatrix = m.identity(m.create()); // ビュー座標変換行列
  var pMatrix = m.identity(m.create()); // プロジェクション座標変換行列
  var vpMatrix = m.identity(m.create()); // p x v行列（座標変換行列）
  var mvpMatrix = m.identity(m.create()); // p x v x m行列（座標変換行列）
  var invMatrix = m.identity(m.create()); // p x v x m行列の逆行列
  
  // p x v行列定義
  m.lookAt([0.0, 0.0, 20.0], [0, 0, 0], [0, 1, 0], vMatrix);
  m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
  m.multiply(pMatrix, vMatrix, vpMatrix);
  
  // 並行光源の向き
  var lightDirection = [-0.5, 0.5, 0.5];
  
  // 環境光の色
  var ambientColor = [0.1, 0.1, 0.1, 1.0];
  
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
    
    // カリングを有効にする
    gl.enable(gl.CULL_FACE)
    gl.frontFace(gl.CCW)
      
    // 深度テストを有効にする
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    // ラジアン算出のためカウンタをインクリメントしておく
    count++;
    count %= 360;
    
    // カウンタを元にラジアンを算出
    var rad = count * Math.PI / 180;
    
    // モデル座標変換行列を定義 Y-Z軸による回転
    m.identity(mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 1], mMatrix);
    m.multiply(vpMatrix, mMatrix, mvpMatrix);
    
    // モデル座標変換行列の逆行列を定義
    m.inverse(mMatrix, invMatrix);
    
    // uniform変数の登録
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, invMatrix);
    gl.uniform3fv(uniLocation[2], lightDirection);
    gl.uniform4fv(uniLocation[3], ambientColor);
    
    // モデルの描画
    gl.drawElements(gl.TRIANGLES, vertex_index.length, gl.UNSIGNED_SHORT, 0);
    
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
    
    /**
     * トーラスを作成する関数 引数は全て正の数値
     * @param {} row トーラスのパイプの分割数
     * @param {} column トーラスのパイプの断面を正何角形で表現するか決める変数
     * @param {} irad トーラスのパイプの断面の半径
     * @param {} orad トーラスの原点からパイプの断面中心までの距離
     * @return {} トーラスの頂点座標、法線、頂点色、頂点インデックスを一つにまとめた配列
     */
     function create_torus(row, column, irad, orad){
       var pos = new Array(); // 頂点座標の配列
       var nor = new Array(); // 法線の配列
       var col = new Array(); // 頂点色の配列
       var idx = new Array(); // 頂点インデックスの配列
       
       // 頂点座標と頂点色を決める
       for(var i=0; i <= column; i++){
         var r = Math.PI * 2 / column * i;
         var rr = Math.cos(r);
         var ry = Math.sin(r);
         for(var j = 0; j<= row; j++){
           var tr = Math.PI * 2 / row * j;
           var tr_cos = Math.cos(tr);
           var tr_sin = Math.sin(tr);
           pos.push((rr * irad + orad) * tr_cos, ry * irad, (rr * irad + orad) * tr_sin);
           nor.push(rr * tr_cos, ry * irad, rr * tr_sin);
           var tc = hsva2rgba(360 / row * j, 1, 1, 1);
           col.push(tc[0], tc[1], tc[2], tc[3]);
         }
       }
       
       // 頂点インデックスを決める
       for(var i=0; i < column; i++){
         for(var j = 0; j < row; j++){
           var r = (row + 1) * i + j;
           idx.push(r, r + row + 1, r + 1);
           idx.push(r + row + 1, r + row + 2, r + 1);
         }
       }
       
       return [pos, nor, col, idx];
     }
     
     /**
      * HSVAからRGBAへ変換を行う関数
      * @param {} h 色相(Hue)        ※0～360の数値
      * @param {} s 彩度(Saturation) ※0～1の数値
      * @param {} v 明度(Value)      ※0～1の数値
      * @param {} a 透過度(alpha)    ※0～1の数値
      * @return {} 変換後のRGBA配列
      */
     function hsva2rgba(h, s, v, a){
       var th = h % 360; // hが範囲外の値だった場合用
       var i = Math.floor(th / 60);
       var f = th / 60 - i;
       var l = v * (1 - s);
       var m = v * (1 - s * f);
       var n = v * (1 - s * (1 - f));
       var color = new Array();
       if(Math.abs(s) < Number.EPSILON){
         color.push(v, v, v, a);
       }else{
         var r = new Array(v, m, l, l, n, v);
         var g = new Array(n, v, v, m, l, l);
         var b = new Array(l, l, n, v, v, m);
         color.push(r[i], g[i], b[i], a);
       }
       return color;
     }
};