/**
 * シェーダのコンパイルとリンク - wgld.org
 * http://wgld.org/d/webgl/w011.html
 */
onload = function(){
  // canvasエレメントを取得
  var c = document.getElementById('canvas');
  c.width = 500;
  c.height = 300;
  
  // webglコンテキストを取得
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
  
  // canvasを黒で初期化する
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
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
};