import {Component,type ReactNode} from 'react';
import {Map} from 'lucide-react';
export default class GraphicsBoundary extends Component<{children:ReactNode;onFallback:()=>void},{error:boolean}>{
 state={error:false};static getDerivedStateFromError(){return {error:true};}
 render(){return this.state.error?<div className="map-failure"><Map size={30}/><h3>Graphics could not initialize</h3><p>News, weather and radio remain available. Try the 2D map or reload if the graphics download failed.</p><button className="primary-link" onClick={this.props.onFallback}>Return to map</button></div>:this.props.children;}
}
