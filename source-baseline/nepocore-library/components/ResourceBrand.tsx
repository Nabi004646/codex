'use client';
import {useState} from 'react';
import type {Resource} from '../lib/types';
const logos:Record<string,string>={
 '0522e8689e47e6d2':'comfyui.png',
 '52c0fdeaeecb210e':'activepieces.svg',
 'a1047f5c1d3715cf':'actual.png',
 '5b5aa7987133f8d4':'blender.svg',
 'ebb5f6d88c1072f7':'wger.png',
 '07846c15f56ca9a3':'react-bits.png',
};
export default function ResourceBrand({resource}:{resource:Resource}){
 const [failed,setFailed]=useState(false),logo=logos[resource.id];
 if(!logo||failed)return null;
 return <img className="provider-logo" src={'/logos/'+logo} alt="" aria-hidden="true" width={24} height={24} loading="lazy" decoding="async" onError={()=>setFailed(true)}/>;
}
