varying float vNoise;
varying vec2 vUv;
uniform sampler2D uImage;
uniform float time;
uniform float hoverState;



void main()	{

    vec2 newUV = vUv;


    vec4 oceanView = texture2D(uImage,newUV);

    gl_FragColor = oceanView;
    gl_FragColor.rgb += 0.05*vec3(vNoise);

    
}