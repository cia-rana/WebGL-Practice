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
  
  // トーラスの頂点データを生成(VBO、IBOの生成・バインド・登録を含む)
  var torus_data = create_torus(64, 64, 0.5, 1.5, [0.75, 0.25, 0.25, 1.0]);
  var torus_vbo_list = [create_vbo(torus_data.pos), create_vbo(torus_data.nor), create_vbo(torus_data.col)];
  var torus_ibo_list = create_ibo(torus_data.idx);
  
  // 球体の頂点データを生成(VBO、IBOの生成・バインド・登録を含む)
  var sphere_data = create_sphere(64, 64, 2.0, [0.25, 0.25, 0.75, 1.0]);
  var sphere_vbo_list = [create_vbo(sphere_data.pos), create_vbo(sphere_data.nor), create_vbo(sphere_data.col)];
  var sphere_ibo_list = create_ibo(sphere_data.idx);
  
  // uniformLocationの取得
  var uniLocation = new Array(6);
  uniLocation[0] = gl.getUniformLocation(prg_obj, 'mvpMatrix');
  uniLocation[1] = gl.getUniformLocation(prg_obj, 'mMatrix');
  uniLocation[2] = gl.getUniformLocation(prg_obj, 'invMatrix');
  uniLocation[3] = gl.getUniformLocation(prg_obj, 'lightDirection');
  uniLocation[4] = gl.getUniformLocation(prg_obj, 'eyeDirection');
  uniLocation[5] = gl.getUniformLocation(prg_obj, 'ambientColor');
  
  // matIVオブジェクトを生成（minMatrix.jsより）
  var m = new matIV();
  
  // 各種行列の生成と初期化
  var mMatrix = m.identity(m.create()); // モデル座標変換行列
  var vMatrix = m.identity(m.create()); // ビュー座標変換行列
  var pMatrix = m.identity(m.create()); // プロジェクション座標変換行列
  var vpMatrix = m.identity(m.create()); // p x v行列（座標変換行列）
  var mvpMatrix = m.identity(m.create()); // p x v x m行列（座標変換行列）
  var invMatrix = m.identity(m.create()); // p x v x m行列の逆行列
  
  // 視点ベクトル
  var eyeDirection = [0.0, 0.0, 20.0];
  
  // p x v行列定義
  m.lookAt(eyeDirection, [0, 0, 0], [0, 1, 0], vMatrix);
  m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
  m.multiply(pMatrix, vMatrix, vpMatrix);
  
  // 並行光源の向き
  var lightDirection = [-0.5, 0.5, 0.5];
  
  // 環境光の色
  var ambientColor = [0.1, 0.1, 0.1, 1.0];
  
  // 点光源の位置
  var lightPosition = [0.1, 0.1, 0.1];
  
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
    
    // カウンタを元にラジアンと各種座標を算出
    count++;
    count %= 360;
    var rad = count * Math.PI / 180;
    var tx = Math.cos(rad) * 3.5;
    var ty = Math.sin(rad) * 3.5;
    var tz = Math.sin(rad) * 3.5;
    
    // トーラスのVBOとIBOをセット
    set_attribute(torus_vbo_list, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torus_ibo_list);
    
    // トーラスのモデル座標変換行列を定義
    m.identity(mMatrix);
    m.translate(mMatrix, [tx, -ty, -tz], mMatrix);
    m.rotate(mMatrix, -rad, [0, 1, 1], mMatrix);
    m.multiply(vpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);
    
    // トーラスのuniform変数の登録
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    gl.uniform3fv(uniLocation[3], lightDirection);
    gl.uniform3fv(uniLocation[4], eyeDirection);
    gl.uniform4fv(uniLocation[5], ambientColor);
    
    // トーラスのモデルの描画
    gl.drawElements(gl.TRIANGLES, torus_data.idx.length, gl.UNSIGNED_SHORT, 0);
    
    // 球体のVBOとIBOをセット
    set_attribute(sphere_vbo_list, attLocation, attStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphere_ibo_list);
    
    // 球体のモデル座標変換行列を定義
    m.identity(mMatrix);
    m.translate(mMatrix, [-tx, ty, tz], mMatrix);
    m.multiply(vpMatrix, mMatrix, mvpMatrix);
    m.inverse(mMatrix, invMatrix);
    
    // 球体のuniform変数の登録
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniformMatrix4fv(uniLocation[1], false, mMatrix);
    gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
    
    // 球体のモデルの描画
    gl.drawElements(gl.TRIANGLES, sphere_data.idx.length, gl.UNSIGNED_SHORT, 0);
    
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
     * @param {] color トーラスの色
     * @return {} トーラスの頂点座標、法線、頂点色、頂点インデックスを一つにまとめた配列
     */
     function create_torus(row, column, irad, orad, color){
       var pos = new Array(); // 頂点座標の配列
       var nor = new Array(); // 法線の配列
       var col = new Array(); // 頂点色の配列
       var idx = new Array(); // 頂点インデックスの配列
       var push = Array.prototype.push;
       
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
           push.apply(col, color ? color : hsva2rgba(360 / row * i, 1, 1, 1));
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
       
       return {pos : pos, nor : nor, col : col, idx : idx};
     }
     
     /**
      * 球体を生成する関数
      * @param {} row    球体の緯度頂点数
      * @param {} column 球体の経度頂点数
      * @param {} rad    球体の半径
      * @param {} color  球体の色
      */
     function create_sphere(row, column, rad, color){
       var pos = new Array();
       var nor = new Array();
       var col = new Array();
       var idx = new Array();
       var push = Array.prototype.push;
       
       for(var i = 0; i <= row; i++){
         var r = Math.PI / row * i;
         var ry = Math.cos(r);
         var rr = Math.sin(r);
         for(var j = 0; j <= column; j++){
           var tr = Math.PI * 2 / column * j;
           var rr_cos = rr * Math.cos(tr);
           var rr_sin = rr * Math.sin(tr);
           var tx = rr_cos * rad;
           var ty = ry * rad;
           var tz = rr_sin * rad;
           var rx = rr_cos;
           var rz = rr_sin;
           pos.push(tx, ty, tz);
           nor.push(rx, ry, rz);
           push.apply(col, color ? color : hsva2rgba(360 / row * i, 1, 1, 1));
         }
       }
       
       var r = 0;
       for(var i = 0; i < row; i++){
         for(var j = 0; j < column; j++){
           r = (column + 1) * i + j;
           idx.push(r, r + 1, r + column + 2);
           idx.push(r, r + column + 2, r + column + 1);
         }
       }
       return {pos : pos, nor : nor, col : col, idx : idx};
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