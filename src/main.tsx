import React,{Component,type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
class Boundary extends Component<{children:ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<main className="fatal"><h1>Let’s reconnect.</h1><p>The interface encountered an unexpected error. Your saved places are still on this browser.</p><button onClick={()=>location.reload()}>Reload Meridian</button></main>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Boundary><App/></Boundary></React.StrictMode>);
