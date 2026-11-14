import {Component,type ReactNode} from 'react';

export default class RecoveryBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 onChunkError=(event:Event)=>{event.preventDefault();this.setState({failed:true});};
 componentDidMount(){window.addEventListener('vite:preloadError',this.onChunkError);}
 componentWillUnmount(){window.removeEventListener('vite:preloadError',this.onChunkError);}
 render(){
  if(this.state.failed)return <main className="recovery-screen" role="alert"><a className="recovery-brand" href="/">FreeResourceAtlas</a><p className="eyebrow">LET’S GET YOU BACK</p><h1>This page couldn’t finish loading.</h1><p>Your connection may have dropped, or the site may have just updated. Reload to open a fresh copy.</p><button className="primary-button" onClick={()=>window.location.reload()}>Reload this page</button><a className="subtle-button" href="/">Return to the library</a></main>;
  return this.props.children;
 }
}
