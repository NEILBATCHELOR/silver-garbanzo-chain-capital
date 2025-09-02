/**
 * Conditional Web3 Infrastructure
 * 
 * Exports for selective Wagmi provider usage based on routes/components
 */

import { ConditionalWagmiWrapper as ConditionalWagmiWrapperComponent } from './ConditionalWagmiWrapper';

export { ConditionalWagmiWrapper } from './ConditionalWagmiWrapper';
export { WagmiRouteWrapper } from './WagmiRouteWrapper';

export default ConditionalWagmiWrapperComponent;
