"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[2452],{22452:function(e,t,i){i.r(t),i.d(t,{AppKitModal:function(){return ev},W3mModal:function(){return eh},W3mModalBase:function(){return em}});var o=i(31133),r=i(19848),a=i(32801),n=i(44649),s=i(48415),l=i(49425),c=i(6943),d=i(35652),w=i(17766),p=i(86777),u=i(41505);let m={isUnsupportedChainView:()=>"UnsupportedChain"===p.RouterController.state.view||"SwitchNetwork"===p.RouterController.state.view&&p.RouterController.state.history.includes("UnsupportedChain"),async safeClose(){if(this.isUnsupportedChainView()||await u.w.isSIWXCloseDisabled()){l.I.shake();return}l.I.close()}};var h=i(52005),v=i(66909),g=i(53357),y=i(30795),f=i(84249),b=i(57116),C=(0,o.iv)`
  :host {
    display: block;
    border-radius: clamp(0px, var(--wui-border-radius-l), 44px);
    box-shadow: 0 0 0 1px var(--wui-color-gray-glass-005);
    background-color: var(--wui-color-modal-bg);
    overflow: hidden;
  }

  :host([data-embedded='true']) {
    box-shadow:
      0 0 0 1px var(--wui-color-gray-glass-005),
      0px 4px 12px 4px var(--w3m-card-embedded-shadow-color);
  }
`;let k=class extends o.oi{render(){return(0,o.dy)`<slot></slot>`}};k.styles=[f.ET,C],k=function(e,t,i,o){var r,a=arguments.length,n=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,o);else for(var s=e.length-1;s>=0;s--)(r=e[s])&&(n=(a<3?r(n):a>3?r(t,i,n):r(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n}([(0,b.M)("wui-card")],k),i(96277);var x=i(72723);i(95137),i(18360),i(5680);var S=(0,o.iv)`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--wui-spacing-s);
    border-radius: var(--wui-border-radius-s);
    border: 1px solid var(--wui-color-dark-glass-100);
    box-sizing: border-box;
    background-color: var(--wui-color-bg-325);
    box-shadow: 0px 0px 16px 0px rgba(0, 0, 0, 0.25);
  }

  wui-flex {
    width: 100%;
  }

  wui-text {
    word-break: break-word;
    flex: 1;
  }

  .close {
    cursor: pointer;
  }

  .icon-box {
    height: 40px;
    width: 40px;
    border-radius: var(--wui-border-radius-3xs);
    background-color: var(--local-icon-bg-value);
  }
`,R=function(e,t,i,o){var r,a=arguments.length,n=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,o);else for(var s=e.length-1;s>=0;s--)(r=e[s])&&(n=(a<3?r(n):a>3?r(t,i,n):r(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n};let N=class extends o.oi{constructor(){super(...arguments),this.message="",this.backgroundColor="accent-100",this.iconColor="accent-100",this.icon="info"}render(){return this.style.cssText=`
      --local-icon-bg-value: var(--wui-color-${this.backgroundColor});
   `,(0,o.dy)`
      <wui-flex flexDirection="row" justifyContent="space-between" alignItems="center">
        <wui-flex columnGap="xs" flexDirection="row" alignItems="center">
          <wui-flex
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            class="icon-box"
          >
            <wui-icon color=${this.iconColor} size="md" name=${this.icon}></wui-icon>
          </wui-flex>
          <wui-text variant="small-500" color="bg-350" data-testid="wui-alertbar-text"
            >${this.message}</wui-text
          >
        </wui-flex>
        <wui-icon
          class="close"
          color="bg-350"
          size="sm"
          name="close"
          @click=${this.onClose}
        ></wui-icon>
      </wui-flex>
    `}onClose(){x.AlertController.close()}};N.styles=[f.ET,S],R([(0,r.Cb)()],N.prototype,"message",void 0),R([(0,r.Cb)()],N.prototype,"backgroundColor",void 0),R([(0,r.Cb)()],N.prototype,"iconColor",void 0),R([(0,r.Cb)()],N.prototype,"icon",void 0),N=R([(0,b.M)("wui-alertbar")],N);var O=(0,o.iv)`
  :host {
    display: block;
    position: absolute;
    top: var(--wui-spacing-s);
    left: var(--wui-spacing-l);
    right: var(--wui-spacing-l);
    opacity: 0;
    pointer-events: none;
  }
`,T=function(e,t,i,o){var r,a=arguments.length,n=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,o);else for(var s=e.length-1;s>=0;s--)(r=e[s])&&(n=(a<3?r(n):a>3?r(t,i,n):r(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n};let A={info:{backgroundColor:"fg-350",iconColor:"fg-325",icon:"info"},success:{backgroundColor:"success-glass-reown-020",iconColor:"success-125",icon:"checkmark"},warning:{backgroundColor:"warning-glass-reown-020",iconColor:"warning-100",icon:"warningCircle"},error:{backgroundColor:"error-glass-reown-020",iconColor:"error-125",icon:"exclamationTriangle"}},E=class extends o.oi{constructor(){super(),this.unsubscribe=[],this.open=x.AlertController.state.open,this.onOpen(!0),this.unsubscribe.push(x.AlertController.subscribeKey("open",e=>{this.open=e,this.onOpen(!1)}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let{message:e,variant:t}=x.AlertController.state,i=A[t];return(0,o.dy)`
      <wui-alertbar
        message=${e}
        backgroundColor=${i?.backgroundColor}
        iconColor=${i?.iconColor}
        icon=${i?.icon}
      ></wui-alertbar>
    `}onOpen(e){this.open?(this.animate([{opacity:0,transform:"scale(0.85)"},{opacity:1,transform:"scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: auto"):e||(this.animate([{opacity:1,transform:"scale(1)"},{opacity:0,transform:"scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: none")}};E.styles=O,T([(0,r.SB)()],E.prototype,"open",void 0),E=T([(0,y.Mo)("w3m-alertbar")],E);var I=i(68584),W=i(63043),$=i(22472),P=i(31929),B=(0,o.iv)`
  button {
    border-radius: var(--local-border-radius);
    color: var(--wui-color-fg-100);
    padding: var(--local-padding);
  }

  @media (max-width: 700px) {
    button {
      padding: var(--wui-spacing-s);
    }
  }

  button > wui-icon {
    pointer-events: none;
  }

  button:disabled > wui-icon {
    color: var(--wui-color-bg-300) !important;
  }

  button:disabled {
    background-color: transparent;
  }
`,j=function(e,t,i,o){var r,a=arguments.length,n=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,o);else for(var s=e.length-1;s>=0;s--)(r=e[s])&&(n=(a<3?r(n):a>3?r(t,i,n):r(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n};let D=class extends o.oi{constructor(){super(...arguments),this.size="md",this.disabled=!1,this.icon="copy",this.iconColor="inherit"}render(){let e="lg"===this.size?"--wui-border-radius-xs":"--wui-border-radius-xxs",t="lg"===this.size?"--wui-spacing-1xs":"--wui-spacing-2xs";return this.style.cssText=`
    --local-border-radius: var(${e});
    --local-padding: var(${t});
`,(0,o.dy)`
      <button ?disabled=${this.disabled}>
        <wui-icon color=${this.iconColor} size=${this.size} name=${this.icon}></wui-icon>
      </button>
    `}};D.styles=[f.ET,f.ZM,f.Bp,B],j([(0,r.Cb)()],D.prototype,"size",void 0),j([(0,r.Cb)({type:Boolean})],D.prototype,"disabled",void 0),j([(0,r.Cb)()],D.prototype,"icon",void 0),j([(0,r.Cb)()],D.prototype,"iconColor",void 0),D=j([(0,b.M)("wui-icon-link")],D),i(23805),i(1736);var L=(0,o.iv)`
  button {
    display: block;
    display: flex;
    align-items: center;
    padding: var(--wui-spacing-xxs);
    gap: var(--wui-spacing-xxs);
    transition: all var(--wui-ease-out-power-1) var(--wui-duration-md);
    border-radius: var(--wui-border-radius-xxs);
  }

  wui-image {
    border-radius: 100%;
    width: var(--wui-spacing-xl);
    height: var(--wui-spacing-xl);
  }

  wui-icon-box {
    width: var(--wui-spacing-xl);
    height: var(--wui-spacing-xl);
  }

  button:hover {
    background-color: var(--wui-color-gray-glass-002);
  }

  button:active {
    background-color: var(--wui-color-gray-glass-005);
  }
`,z=function(e,t,i,o){var r,a=arguments.length,n=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,o);else for(var s=e.length-1;s>=0;s--)(r=e[s])&&(n=(a<3?r(n):a>3?r(t,i,n):r(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n};let M=class extends o.oi{constructor(){super(...arguments),this.imageSrc=""}render(){return(0,o.dy)`<button>
      ${this.imageTemplate()}
      <wui-icon size="xs" color="fg-200" name="chevronBottom"></wui-icon>
    </button>`}imageTemplate(){return this.imageSrc?(0,o.dy)`<wui-image src=${this.imageSrc} alt="select visual"></wui-image>`:(0,o.dy)`<wui-icon-box
      size="xxs"
      iconColor="fg-200"
      backgroundColor="fg-100"
      background="opaque"
      icon="networkPlaceholder"
    ></wui-icon-box>`}};M.styles=[f.ET,f.ZM,f.Bp,L],z([(0,r.Cb)()],M.prototype,"imageSrc",void 0),M=z([(0,b.M)("wui-select")],M),i(80675),i(44732);var U=i(54946),H=(0,o.iv)`
  :host {
    height: 64px;
  }

  wui-text {
    text-transform: capitalize;
  }

  wui-flex.w3m-header-title {
    transform: translateY(0);
    opacity: 1;
  }

  wui-flex.w3m-header-title[view-direction='prev'] {
    animation:
      slide-down-out 120ms forwards var(--wui-ease-out-power-2),
      slide-down-in 120ms forwards var(--wui-ease-out-power-2);
    animation-delay: 0ms, 200ms;
  }

  wui-flex.w3m-header-title[view-direction='next'] {
    animation:
      slide-up-out 120ms forwards var(--wui-ease-out-power-2),
      slide-up-in 120ms forwards var(--wui-ease-out-power-2);
    animation-delay: 0ms, 200ms;
  }

  wui-icon-link[data-hidden='true'] {
    opacity: 0 !important;
    pointer-events: none;
  }

  @keyframes slide-up-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(3px);
      opacity: 0;
    }
  }

  @keyframes slide-up-in {
    from {
      transform: translateY(-3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slide-down-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(-3px);
      opacity: 0;
    }
  }

  @keyframes slide-down-in {
    from {
      transform: translateY(3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`,K=function(e,t,i,o){var r,a=arguments.length,n=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,o);else for(var s=e.length-1;s>=0;s--)(r=e[s])&&(n=(a<3?r(n):a>3?r(t,i,n):r(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n};let X=["SmartSessionList"];function V(){let e=p.RouterController.state.data?.connector?.name,t=p.RouterController.state.data?.wallet?.name,i=p.RouterController.state.data?.network?.name,o=t??e,r=d.ConnectorController.getConnectors(),a=1===r.length&&r[0]?.id==="w3m-email";return{Connect:`Connect ${a?"Email":""} Wallet`,Create:"Create Wallet",ChooseAccountName:void 0,Account:void 0,AccountSettings:void 0,AllWallets:"All Wallets",ApproveTransaction:"Approve Transaction",BuyInProgress:"Buy",ConnectingExternal:o??"Connect Wallet",ConnectingWalletConnect:o??"WalletConnect",ConnectingWalletConnectBasic:"WalletConnect",ConnectingSiwe:"Sign In",Convert:"Convert",ConvertSelectToken:"Select token",ConvertPreview:"Preview convert",Downloads:o?`Get ${o}`:"Downloads",EmailLogin:"Email Login",EmailVerifyOtp:"Confirm Email",EmailVerifyDevice:"Register Device",GetWallet:"Get a wallet",Networks:"Choose Network",OnRampProviders:"Choose Provider",OnRampActivity:"Activity",OnRampTokenSelect:"Select Token",OnRampFiatSelect:"Select Currency",Pay:"How you pay",Profile:void 0,SwitchNetwork:i??"Switch Network",SwitchAddress:"Switch Address",Transactions:"Activity",UnsupportedChain:"Switch Network",UpgradeEmailWallet:"Upgrade your Wallet",UpdateEmailWallet:"Edit Email",UpdateEmailPrimaryOtp:"Confirm Current Email",UpdateEmailSecondaryOtp:"Confirm New Email",WhatIsABuy:"What is Buy?",RegisterAccountName:"Choose name",RegisterAccountNameSuccess:"",WalletReceive:"Receive",WalletCompatibleNetworks:"Compatible Networks",Swap:"Swap",SwapSelectToken:"Select token",SwapPreview:"Preview swap",WalletSend:"Send",WalletSendPreview:"Review send",WalletSendSelectToken:"Select Token",WhatIsANetwork:"What is a network?",WhatIsAWallet:"What is a wallet?",ConnectWallets:"Connect wallet",ConnectSocials:"All socials",ConnectingSocial:I.N.state.socialProvider?I.N.state.socialProvider:"Connect Social",ConnectingMultiChain:"Select chain",ConnectingFarcaster:"Farcaster",SwitchActiveChain:"Switch chain",SmartSessionCreated:void 0,SmartSessionList:"Smart Sessions",SIWXSignMessage:"Sign In",PayLoading:"Payment in progress"}}let _=class extends o.oi{constructor(){super(),this.unsubscribe=[],this.heading=V()[p.RouterController.state.view],this.network=c.R.state.activeCaipNetwork,this.networkImage=W.f.getNetworkImage(this.network),this.showBack=!1,this.prevHistoryLength=1,this.view=p.RouterController.state.view,this.viewDirection="",this.headerText=V()[p.RouterController.state.view],this.unsubscribe.push($.W.subscribeNetworkImages(()=>{this.networkImage=W.f.getNetworkImage(this.network)}),p.RouterController.subscribeKey("view",e=>{setTimeout(()=>{this.view=e,this.headerText=V()[e]},U.b.ANIMATION_DURATIONS.HeaderText),this.onViewChange(),this.onHistoryChange()}),c.R.subscribeKey("activeCaipNetwork",e=>{this.network=e,this.networkImage=W.f.getNetworkImage(this.network)}))}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){return(0,o.dy)`
      <wui-flex .padding=${this.getPadding()} justifyContent="space-between" alignItems="center">
        ${this.leftHeaderTemplate()} ${this.titleTemplate()} ${this.rightHeaderTemplate()}
      </wui-flex>
    `}onWalletHelp(){P.X.sendEvent({type:"track",event:"CLICK_WALLET_HELP"}),p.RouterController.push("WhatIsAWallet")}async onClose(){await m.safeClose()}rightHeaderTemplate(){let e=s.OptionsController?.state?.features?.smartSessions;return"Account"===p.RouterController.state.view&&e?(0,o.dy)`<wui-flex>
      <wui-icon-link
        icon="clock"
        @click=${()=>p.RouterController.push("SmartSessionList")}
        data-testid="w3m-header-smart-sessions"
      ></wui-icon-link>
      ${this.closeButtonTemplate()}
    </wui-flex> `:this.closeButtonTemplate()}closeButtonTemplate(){return(0,o.dy)`
      <wui-icon-link
        icon="close"
        @click=${this.onClose.bind(this)}
        data-testid="w3m-header-close"
      ></wui-icon-link>
    `}titleTemplate(){let e=X.includes(this.view);return(0,o.dy)`
      <wui-flex
        view-direction="${this.viewDirection}"
        class="w3m-header-title"
        alignItems="center"
        gap="xs"
      >
        <wui-text variant="paragraph-700" color="fg-100" data-testid="w3m-header-text"
          >${this.headerText}</wui-text
        >
        ${e?(0,o.dy)`<wui-tag variant="main">Beta</wui-tag>`:null}
      </wui-flex>
    `}leftHeaderTemplate(){let{view:e}=p.RouterController.state,t="Connect"===e,i=s.OptionsController.state.enableEmbedded,r=s.OptionsController.state.enableNetworkSwitch;return"Account"===e&&r?(0,o.dy)`<wui-select
        id="dynamic"
        data-testid="w3m-account-select-network"
        active-network=${(0,a.o)(this.network?.name)}
        @click=${this.onNetworks.bind(this)}
        imageSrc=${(0,a.o)(this.networkImage)}
      ></wui-select>`:this.showBack&&!("ApproveTransaction"===e||"ConnectingSiwe"===e||t&&i)?(0,o.dy)`<wui-icon-link
        data-testid="header-back"
        id="dynamic"
        icon="chevronLeft"
        @click=${this.onGoBack.bind(this)}
      ></wui-icon-link>`:(0,o.dy)`<wui-icon-link
      data-hidden=${!t}
      id="dynamic"
      icon="helpCircle"
      @click=${this.onWalletHelp.bind(this)}
    ></wui-icon-link>`}onNetworks(){this.isAllowedNetworkSwitch()&&(P.X.sendEvent({type:"track",event:"CLICK_NETWORKS"}),p.RouterController.push("Networks"))}isAllowedNetworkSwitch(){let e=c.R.getAllRequestedCaipNetworks(),t=!!e&&e.length>1,i=e?.find(({id:e})=>e===this.network?.id);return t||!i}getPadding(){return this.heading?["l","2l","l","2l"]:["0","2l","0","2l"]}onViewChange(){let{history:e}=p.RouterController.state,t=U.b.VIEW_DIRECTION.Next;e.length<this.prevHistoryLength&&(t=U.b.VIEW_DIRECTION.Prev),this.prevHistoryLength=e.length,this.viewDirection=t}async onHistoryChange(){let{history:e}=p.RouterController.state,t=this.shadowRoot?.querySelector("#dynamic");e.length>1&&!this.showBack&&t?(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!0,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"})):e.length<=1&&this.showBack&&t&&(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!1,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}onGoBack(){p.RouterController.goBack()}};_.styles=H,K([(0,r.SB)()],_.prototype,"heading",void 0),K([(0,r.SB)()],_.prototype,"network",void 0),K([(0,r.SB)()],_.prototype,"networkImage",void 0),K([(0,r.SB)()],_.prototype,"showBack",void 0),K([(0,r.SB)()],_.prototype,"prevHistoryLength",void 0),K([(0,r.SB)()],_.prototype,"view",void 0),K([(0,r.SB)()],_.prototype,"viewDirection",void 0),K([(0,r.SB)()],_.prototype,"headerText",void 0),_=K([(0,y.Mo)("w3m-header")],_),i(21793);var Y=(0,o.iv)`
  :host {
    display: flex;
    column-gap: var(--wui-spacing-s);
    align-items: center;
    padding: var(--wui-spacing-xs) var(--wui-spacing-m) var(--wui-spacing-xs) var(--wui-spacing-xs);
    border-radius: var(--wui-border-radius-s);
    border: 1px solid var(--wui-color-gray-glass-005);
    box-sizing: border-box;
    background-color: var(--wui-color-bg-175);
    box-shadow:
      0px 14px 64px -4px rgba(0, 0, 0, 0.15),
      0px 8px 22px -6px rgba(0, 0, 0, 0.15);

    max-width: 300px;
  }

  :host wui-loading-spinner {
    margin-left: var(--wui-spacing-3xs);
  }
`,G=function(e,t,i,o){var r,a=arguments.length,n=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,o);else for(var s=e.length-1;s>=0;s--)(r=e[s])&&(n=(a<3?r(n):a>3?r(t,i,n):r(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n};let q=class extends o.oi{constructor(){super(...arguments),this.backgroundColor="accent-100",this.iconColor="accent-100",this.icon="checkmark",this.message="",this.loading=!1,this.iconType="default"}render(){return(0,o.dy)`
      ${this.templateIcon()}
      <wui-text variant="paragraph-500" color="fg-100" data-testid="wui-snackbar-message"
        >${this.message}</wui-text
      >
    `}templateIcon(){return this.loading?(0,o.dy)`<wui-loading-spinner size="md" color="accent-100"></wui-loading-spinner>`:"default"===this.iconType?(0,o.dy)`<wui-icon size="xl" color=${this.iconColor} name=${this.icon}></wui-icon>`:(0,o.dy)`<wui-icon-box
      size="sm"
      iconSize="xs"
      iconColor=${this.iconColor}
      backgroundColor=${this.backgroundColor}
      icon=${this.icon}
      background="opaque"
    ></wui-icon-box>`}};q.styles=[f.ET,Y],G([(0,r.Cb)()],q.prototype,"backgroundColor",void 0),G([(0,r.Cb)()],q.prototype,"iconColor",void 0),G([(0,r.Cb)()],q.prototype,"icon",void 0),G([(0,r.Cb)()],q.prototype,"message",void 0),G([(0,r.Cb)()],q.prototype,"loading",void 0),G([(0,r.Cb)()],q.prototype,"iconType",void 0),q=G([(0,b.M)("wui-snackbar")],q);var F=(0,o.iv)`
  :host {
    display: block;
    position: absolute;
    opacity: 0;
    pointer-events: none;
    top: 11px;
    left: 50%;
    width: max-content;
  }
`,Z=function(e,t,i,o){var r,a=arguments.length,n=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,o);else for(var s=e.length-1;s>=0;s--)(r=e[s])&&(n=(a<3?r(n):a>3?r(t,i,n):r(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n};let J={loading:void 0,success:{backgroundColor:"success-100",iconColor:"success-100",icon:"checkmark"},error:{backgroundColor:"error-100",iconColor:"error-100",icon:"close"}},Q=class extends o.oi{constructor(){super(),this.unsubscribe=[],this.timeout=void 0,this.open=v.SnackController.state.open,this.unsubscribe.push(v.SnackController.subscribeKey("open",e=>{this.open=e,this.onOpen()}))}disconnectedCallback(){clearTimeout(this.timeout),this.unsubscribe.forEach(e=>e())}render(){let{message:e,variant:t,svg:i}=v.SnackController.state,r=J[t],{icon:a,iconColor:n}=i??r??{};return(0,o.dy)`
      <wui-snackbar
        message=${e}
        backgroundColor=${r?.backgroundColor}
        iconColor=${n}
        icon=${a}
        .loading=${"loading"===t}
      ></wui-snackbar>
    `}onOpen(){clearTimeout(this.timeout),this.open?(this.animate([{opacity:0,transform:"translateX(-50%) scale(0.85)"},{opacity:1,transform:"translateX(-50%) scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.timeout&&clearTimeout(this.timeout),v.SnackController.state.autoClose&&(this.timeout=setTimeout(()=>v.SnackController.hide(),2500))):this.animate([{opacity:1,transform:"translateX(-50%) scale(1)"},{opacity:0,transform:"translateX(-50%) scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"})}};Q.styles=F,Z([(0,r.SB)()],Q.prototype,"open",void 0),Q=Z([(0,y.Mo)("w3m-snackbar")],Q);var ee=i(33085),et=i(55543),ei=i(59388);let eo=(0,ee.sj)({message:"",open:!1,triggerRect:{width:0,height:0,top:0,left:0},variant:"shade"}),er=(0,ei.P)({state:eo,subscribe:e=>(0,ee.Ld)(eo,()=>e(eo)),subscribeKey:(e,t)=>(0,et.VW)(eo,e,t),showTooltip({message:e,triggerRect:t,variant:i}){eo.open=!0,eo.message=e,eo.triggerRect=t,eo.variant=i},hide(){eo.open=!1,eo.message="",eo.triggerRect={width:0,height:0,top:0,left:0}}});i(4594);var ea=(0,o.iv)`
  :host {
    pointer-events: none;
  }

  :host > wui-flex {
    display: var(--w3m-tooltip-display);
    opacity: var(--w3m-tooltip-opacity);
    padding: 9px var(--wui-spacing-s) 10px var(--wui-spacing-s);
    border-radius: var(--wui-border-radius-xxs);
    color: var(--wui-color-bg-100);
    position: fixed;
    top: var(--w3m-tooltip-top);
    left: var(--w3m-tooltip-left);
    transform: translate(calc(-50% + var(--w3m-tooltip-parent-width)), calc(-100% - 8px));
    max-width: calc(var(--w3m-modal-width) - var(--wui-spacing-xl));
    transition: opacity 0.2s var(--wui-ease-out-power-2);
    will-change: opacity;
  }

  :host([data-variant='shade']) > wui-flex {
    background-color: var(--wui-color-bg-150);
    border: 1px solid var(--wui-color-gray-glass-005);
  }

  :host([data-variant='shade']) > wui-flex > wui-text {
    color: var(--wui-color-fg-150);
  }

  :host([data-variant='fill']) > wui-flex {
    background-color: var(--wui-color-fg-100);
    border: none;
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
    color: var(--wui-color-bg-150);
  }

  wui-icon[data-placement='top'] {
    bottom: 0px;
    left: 50%;
    transform: translate(-50%, 95%);
  }

  wui-icon[data-placement='bottom'] {
    top: 0;
    left: 50%;
    transform: translate(-50%, -95%) rotate(180deg);
  }

  wui-icon[data-placement='right'] {
    top: 50%;
    left: 0;
    transform: translate(-65%, -50%) rotate(90deg);
  }

  wui-icon[data-placement='left'] {
    top: 50%;
    right: 0%;
    transform: translate(65%, -50%) rotate(270deg);
  }
`,en=function(e,t,i,o){var r,a=arguments.length,n=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,o);else for(var s=e.length-1;s>=0;s--)(r=e[s])&&(n=(a<3?r(n):a>3?r(t,i,n):r(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n};let es=class extends o.oi{constructor(){super(),this.unsubscribe=[],this.open=er.state.open,this.message=er.state.message,this.triggerRect=er.state.triggerRect,this.variant=er.state.variant,this.unsubscribe.push(er.subscribe(e=>{this.open=e.open,this.message=e.message,this.triggerRect=e.triggerRect,this.variant=e.variant}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){this.dataset.variant=this.variant;let e=this.triggerRect.top,t=this.triggerRect.left;return this.style.cssText=`
    --w3m-tooltip-top: ${e}px;
    --w3m-tooltip-left: ${t}px;
    --w3m-tooltip-parent-width: ${this.triggerRect.width/2}px;
    --w3m-tooltip-display: ${this.open?"flex":"none"};
    --w3m-tooltip-opacity: ${this.open?1:0};
    `,(0,o.dy)`<wui-flex>
      <wui-icon data-placement="top" color="fg-100" size="inherit" name="cursor"></wui-icon>
      <wui-text color="inherit" variant="small-500">${this.message}</wui-text>
    </wui-flex>`}};es.styles=[ea],en([(0,r.SB)()],es.prototype,"open",void 0),en([(0,r.SB)()],es.prototype,"message",void 0),en([(0,r.SB)()],es.prototype,"triggerRect",void 0),en([(0,r.SB)()],es.prototype,"variant",void 0),es=en([(0,y.Mo)("w3m-tooltip"),(0,y.Mo)("w3m-tooltip")],es);var el=(0,o.iv)`
  :host {
    --prev-height: 0px;
    --new-height: 0px;
    display: block;
  }

  div.w3m-router-container {
    transform: translateY(0);
    opacity: 1;
  }

  div.w3m-router-container[view-direction='prev'] {
    animation:
      slide-left-out 150ms forwards ease,
      slide-left-in 150ms forwards ease;
    animation-delay: 0ms, 200ms;
  }

  div.w3m-router-container[view-direction='next'] {
    animation:
      slide-right-out 150ms forwards ease,
      slide-right-in 150ms forwards ease;
    animation-delay: 0ms, 200ms;
  }

  @keyframes slide-left-out {
    from {
      transform: translateX(0px);
      opacity: 1;
    }
    to {
      transform: translateX(10px);
      opacity: 0;
    }
  }

  @keyframes slide-left-in {
    from {
      transform: translateX(-10px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slide-right-out {
    from {
      transform: translateX(0px);
      opacity: 1;
    }
    to {
      transform: translateX(-10px);
      opacity: 0;
    }
  }

  @keyframes slide-right-in {
    from {
      transform: translateX(10px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`,ec=function(e,t,i,o){var r,a=arguments.length,n=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,o);else for(var s=e.length-1;s>=0;s--)(r=e[s])&&(n=(a<3?r(n):a>3?r(t,i,n):r(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n};let ed=class extends o.oi{constructor(){super(),this.resizeObserver=void 0,this.prevHeight="0px",this.prevHistoryLength=1,this.unsubscribe=[],this.view=p.RouterController.state.view,this.viewDirection="",this.unsubscribe.push(p.RouterController.subscribeKey("view",e=>this.onViewChange(e)))}firstUpdated(){this.resizeObserver=new ResizeObserver(([e])=>{let t=`${e?.contentRect.height}px`;"0px"!==this.prevHeight&&(this.style.setProperty("--prev-height",this.prevHeight),this.style.setProperty("--new-height",t),this.style.animation="w3m-view-height 150ms forwards ease",this.style.height="auto"),setTimeout(()=>{this.prevHeight=t,this.style.animation="unset"},U.b.ANIMATION_DURATIONS.ModalHeight)}),this.resizeObserver?.observe(this.getWrapper())}disconnectedCallback(){this.resizeObserver?.unobserve(this.getWrapper()),this.unsubscribe.forEach(e=>e())}render(){return(0,o.dy)`<div class="w3m-router-container" view-direction="${this.viewDirection}">
      ${this.viewTemplate()}
    </div>`}viewTemplate(){switch(this.view){case"AccountSettings":return(0,o.dy)`<w3m-account-settings-view></w3m-account-settings-view>`;case"Account":return(0,o.dy)`<w3m-account-view></w3m-account-view>`;case"AllWallets":return(0,o.dy)`<w3m-all-wallets-view></w3m-all-wallets-view>`;case"ApproveTransaction":return(0,o.dy)`<w3m-approve-transaction-view></w3m-approve-transaction-view>`;case"BuyInProgress":return(0,o.dy)`<w3m-buy-in-progress-view></w3m-buy-in-progress-view>`;case"ChooseAccountName":return(0,o.dy)`<w3m-choose-account-name-view></w3m-choose-account-name-view>`;case"Connect":default:return(0,o.dy)`<w3m-connect-view></w3m-connect-view>`;case"Create":return(0,o.dy)`<w3m-connect-view walletGuide="explore"></w3m-connect-view>`;case"ConnectingWalletConnect":return(0,o.dy)`<w3m-connecting-wc-view></w3m-connecting-wc-view>`;case"ConnectingWalletConnectBasic":return(0,o.dy)`<w3m-connecting-wc-basic-view></w3m-connecting-wc-basic-view>`;case"ConnectingExternal":return(0,o.dy)`<w3m-connecting-external-view></w3m-connecting-external-view>`;case"ConnectingSiwe":return(0,o.dy)`<w3m-connecting-siwe-view></w3m-connecting-siwe-view>`;case"ConnectWallets":return(0,o.dy)`<w3m-connect-wallets-view></w3m-connect-wallets-view>`;case"ConnectSocials":return(0,o.dy)`<w3m-connect-socials-view></w3m-connect-socials-view>`;case"ConnectingSocial":return(0,o.dy)`<w3m-connecting-social-view></w3m-connecting-social-view>`;case"Downloads":return(0,o.dy)`<w3m-downloads-view></w3m-downloads-view>`;case"EmailLogin":return(0,o.dy)`<w3m-email-login-view></w3m-email-login-view>`;case"EmailVerifyOtp":return(0,o.dy)`<w3m-email-verify-otp-view></w3m-email-verify-otp-view>`;case"EmailVerifyDevice":return(0,o.dy)`<w3m-email-verify-device-view></w3m-email-verify-device-view>`;case"GetWallet":return(0,o.dy)`<w3m-get-wallet-view></w3m-get-wallet-view>`;case"Networks":return(0,o.dy)`<w3m-networks-view></w3m-networks-view>`;case"SwitchNetwork":return(0,o.dy)`<w3m-network-switch-view></w3m-network-switch-view>`;case"Profile":return(0,o.dy)`<w3m-profile-view></w3m-profile-view>`;case"SwitchAddress":return(0,o.dy)`<w3m-switch-address-view></w3m-switch-address-view>`;case"Transactions":return(0,o.dy)`<w3m-transactions-view></w3m-transactions-view>`;case"OnRampProviders":return(0,o.dy)`<w3m-onramp-providers-view></w3m-onramp-providers-view>`;case"OnRampActivity":return(0,o.dy)`<w3m-onramp-activity-view></w3m-onramp-activity-view>`;case"OnRampTokenSelect":return(0,o.dy)`<w3m-onramp-token-select-view></w3m-onramp-token-select-view>`;case"OnRampFiatSelect":return(0,o.dy)`<w3m-onramp-fiat-select-view></w3m-onramp-fiat-select-view>`;case"UpgradeEmailWallet":return(0,o.dy)`<w3m-upgrade-wallet-view></w3m-upgrade-wallet-view>`;case"UpdateEmailWallet":return(0,o.dy)`<w3m-update-email-wallet-view></w3m-update-email-wallet-view>`;case"UpdateEmailPrimaryOtp":return(0,o.dy)`<w3m-update-email-primary-otp-view></w3m-update-email-primary-otp-view>`;case"UpdateEmailSecondaryOtp":return(0,o.dy)`<w3m-update-email-secondary-otp-view></w3m-update-email-secondary-otp-view>`;case"UnsupportedChain":return(0,o.dy)`<w3m-unsupported-chain-view></w3m-unsupported-chain-view>`;case"Swap":return(0,o.dy)`<w3m-swap-view></w3m-swap-view>`;case"SwapSelectToken":return(0,o.dy)`<w3m-swap-select-token-view></w3m-swap-select-token-view>`;case"SwapPreview":return(0,o.dy)`<w3m-swap-preview-view></w3m-swap-preview-view>`;case"WalletSend":return(0,o.dy)`<w3m-wallet-send-view></w3m-wallet-send-view>`;case"WalletSendSelectToken":return(0,o.dy)`<w3m-wallet-send-select-token-view></w3m-wallet-send-select-token-view>`;case"WalletSendPreview":return(0,o.dy)`<w3m-wallet-send-preview-view></w3m-wallet-send-preview-view>`;case"WhatIsABuy":return(0,o.dy)`<w3m-what-is-a-buy-view></w3m-what-is-a-buy-view>`;case"WalletReceive":return(0,o.dy)`<w3m-wallet-receive-view></w3m-wallet-receive-view>`;case"WalletCompatibleNetworks":return(0,o.dy)`<w3m-wallet-compatible-networks-view></w3m-wallet-compatible-networks-view>`;case"WhatIsAWallet":return(0,o.dy)`<w3m-what-is-a-wallet-view></w3m-what-is-a-wallet-view>`;case"ConnectingMultiChain":return(0,o.dy)`<w3m-connecting-multi-chain-view></w3m-connecting-multi-chain-view>`;case"WhatIsANetwork":return(0,o.dy)`<w3m-what-is-a-network-view></w3m-what-is-a-network-view>`;case"ConnectingFarcaster":return(0,o.dy)`<w3m-connecting-farcaster-view></w3m-connecting-farcaster-view>`;case"SwitchActiveChain":return(0,o.dy)`<w3m-switch-active-chain-view></w3m-switch-active-chain-view>`;case"RegisterAccountName":return(0,o.dy)`<w3m-register-account-name-view></w3m-register-account-name-view>`;case"RegisterAccountNameSuccess":return(0,o.dy)`<w3m-register-account-name-success-view></w3m-register-account-name-success-view>`;case"SmartSessionCreated":return(0,o.dy)`<w3m-smart-session-created-view></w3m-smart-session-created-view>`;case"SmartSessionList":return(0,o.dy)`<w3m-smart-session-list-view></w3m-smart-session-list-view>`;case"SIWXSignMessage":return(0,o.dy)`<w3m-siwx-sign-message-view></w3m-siwx-sign-message-view>`;case"Pay":return(0,o.dy)`<w3m-pay-view></w3m-pay-view>`;case"PayLoading":return(0,o.dy)`<w3m-pay-loading-view></w3m-pay-loading-view>`}}onViewChange(e){er.hide();let t=U.b.VIEW_DIRECTION.Next,{history:i}=p.RouterController.state;i.length<this.prevHistoryLength&&(t=U.b.VIEW_DIRECTION.Prev),this.prevHistoryLength=i.length,this.viewDirection=t,setTimeout(()=>{this.view=e},U.b.ANIMATION_DURATIONS.ViewTransition)}getWrapper(){return this.shadowRoot?.querySelector("div")}};ed.styles=el,ec([(0,r.SB)()],ed.prototype,"view",void 0),ec([(0,r.SB)()],ed.prototype,"viewDirection",void 0),ed=ec([(0,y.Mo)("w3m-router")],ed);var ew=(0,o.iv)`
  :host {
    z-index: var(--w3m-z-index);
    display: block;
    backface-visibility: hidden;
    will-change: opacity;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    opacity: 0;
    background-color: var(--wui-cover);
    transition: opacity 0.2s var(--wui-ease-out-power-2);
    will-change: opacity;
  }

  :host(.open) {
    opacity: 1;
  }

  :host(.appkit-modal) {
    position: relative;
    pointer-events: unset;
    background: none;
    width: 100%;
    opacity: 1;
  }

  wui-card {
    max-width: var(--w3m-modal-width);
    width: 100%;
    position: relative;
    animation: zoom-in 0.2s var(--wui-ease-out-power-2);
    animation-fill-mode: backwards;
    outline: none;
    transition:
      border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1),
      background-color var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: border-radius, background-color;
  }

  :host(.appkit-modal) wui-card {
    max-width: 400px;
  }

  wui-card[shake='true'] {
    animation:
      zoom-in 0.2s var(--wui-ease-out-power-2),
      w3m-shake 0.5s var(--wui-ease-out-power-2);
  }

  wui-flex {
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  @media (max-height: 700px) and (min-width: 431px) {
    wui-flex {
      align-items: flex-start;
    }

    wui-card {
      margin: var(--wui-spacing-xxl) 0px;
    }
  }

  @media (max-width: 430px) {
    wui-flex {
      align-items: flex-end;
    }

    wui-card {
      max-width: 100%;
      border-bottom-left-radius: var(--local-border-bottom-mobile-radius);
      border-bottom-right-radius: var(--local-border-bottom-mobile-radius);
      border-bottom: none;
      animation: slide-in 0.2s var(--wui-ease-out-power-2);
    }

    wui-card[shake='true'] {
      animation:
        slide-in 0.2s var(--wui-ease-out-power-2),
        w3m-shake 0.5s var(--wui-ease-out-power-2);
    }
  }

  @keyframes zoom-in {
    0% {
      transform: scale(0.95) translateY(0);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes slide-in {
    0% {
      transform: scale(1) translateY(50px);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes w3m-shake {
    0% {
      transform: scale(1) rotate(0deg);
    }
    20% {
      transform: scale(1) rotate(-1deg);
    }
    40% {
      transform: scale(1) rotate(1.5deg);
    }
    60% {
      transform: scale(1) rotate(-1.5deg);
    }
    80% {
      transform: scale(1) rotate(1deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
    }
  }

  @keyframes w3m-view-height {
    from {
      height: var(--prev-height);
    }
    to {
      height: var(--new-height);
    }
  }
`,ep=function(e,t,i,o){var r,a=arguments.length,n=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,o);else for(var s=e.length-1;s>=0;s--)(r=e[s])&&(n=(a<3?r(n):a>3?r(t,i,n):r(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n};let eu="scroll-lock";class em extends o.oi{constructor(){super(),this.unsubscribe=[],this.abortController=void 0,this.hasPrefetched=!1,this.enableEmbedded=s.OptionsController.state.enableEmbedded,this.open=l.I.state.open,this.caipAddress=c.R.state.activeCaipAddress,this.caipNetwork=c.R.state.activeCaipNetwork,this.shake=l.I.state.shake,this.filterByNamespace=d.ConnectorController.state.filterByNamespace,this.initializeTheming(),w.ApiController.prefetchAnalyticsConfig(),this.unsubscribe.push(l.I.subscribeKey("open",e=>e?this.onOpen():this.onClose()),l.I.subscribeKey("shake",e=>this.shake=e),c.R.subscribeKey("activeCaipNetwork",e=>this.onNewNetwork(e)),c.R.subscribeKey("activeCaipAddress",e=>this.onNewAddress(e)),s.OptionsController.subscribeKey("enableEmbedded",e=>this.enableEmbedded=e),d.ConnectorController.subscribeKey("filterByNamespace",e=>{this.filterByNamespace===e||c.R.getAccountData(e)?.caipAddress||(w.ApiController.fetchRecommendedWallets(),this.filterByNamespace=e)}))}firstUpdated(){if(this.caipAddress){if(this.enableEmbedded){l.I.close(),this.prefetch();return}this.onNewAddress(this.caipAddress)}this.open&&this.onOpen(),this.enableEmbedded&&this.prefetch()}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.onRemoveKeyboardListener()}render(){return(this.style.cssText=`
      --local-border-bottom-mobile-radius: ${this.enableEmbedded?"clamp(0px, var(--wui-border-radius-l), 44px)":"0px"};
    `,this.enableEmbedded)?(0,o.dy)`${this.contentTemplate()}
        <w3m-tooltip></w3m-tooltip> `:this.open?(0,o.dy)`
          <wui-flex @click=${this.onOverlayClick.bind(this)} data-testid="w3m-modal-overlay">
            ${this.contentTemplate()}
          </wui-flex>
          <w3m-tooltip></w3m-tooltip>
        `:null}contentTemplate(){return(0,o.dy)` <wui-card
      shake="${this.shake}"
      data-embedded="${(0,a.o)(this.enableEmbedded)}"
      role="alertdialog"
      aria-modal="true"
      tabindex="0"
      data-testid="w3m-modal-card"
    >
      <w3m-header></w3m-header>
      <w3m-router></w3m-router>
      <w3m-snackbar></w3m-snackbar>
      <w3m-alertbar></w3m-alertbar>
    </wui-card>`}async onOverlayClick(e){e.target===e.currentTarget&&await this.handleClose()}async handleClose(){await m.safeClose()}initializeTheming(){let{themeVariables:e,themeMode:t}=h.ThemeController.state,i=y.Hg.getColorTheme(t);(0,y.n)(e,i)}onClose(){this.open=!1,this.classList.remove("open"),this.onScrollUnlock(),v.SnackController.hide(),this.onRemoveKeyboardListener()}onOpen(){this.open=!0,this.classList.add("open"),this.onScrollLock(),this.onAddKeyboardListener()}onScrollLock(){let e=document.createElement("style");e.dataset.w3m=eu,e.textContent=`
      body {
        touch-action: none;
        overflow: hidden;
        overscroll-behavior: contain;
      }
      w3m-modal {
        pointer-events: auto;
      }
    `,document.head.appendChild(e)}onScrollUnlock(){let e=document.head.querySelector(`style[data-w3m="${eu}"]`);e&&e.remove()}onAddKeyboardListener(){this.abortController=new AbortController;let e=this.shadowRoot?.querySelector("wui-card");e?.focus(),window.addEventListener("keydown",t=>{if("Escape"===t.key)this.handleClose();else if("Tab"===t.key){let{tagName:i}=t.target;!i||i.includes("W3M-")||i.includes("WUI-")||e?.focus()}},this.abortController)}onRemoveKeyboardListener(){this.abortController?.abort(),this.abortController=void 0}async onNewAddress(e){let t=c.R.state.isSwitchingNamespace,i=g.j.getPlainAddress(e);i||t?t&&i&&p.RouterController.goBack():l.I.close(),await u.w.initializeIfEnabled(),this.caipAddress=e,c.R.setIsSwitchingNamespace(!1)}onNewNetwork(e){let t=this.caipNetwork,i=t?.caipNetworkId?.toString(),o=t?.chainNamespace,r=e?.caipNetworkId?.toString(),a=e?.chainNamespace,s=i!==r,d=t?.name===n.b.UNSUPPORTED_NETWORK_NAME,w="ConnectingExternal"===p.RouterController.state.view,u=!c.R.getAccountData(e?.chainNamespace)?.caipAddress,m="UnsupportedChain"===p.RouterController.state.view,h=l.I.state.open,v=!1;h&&!w&&(u?s&&(v=!0):m?v=!0:!s||o!==a||d||(v=!0)),v&&"SIWXSignMessage"!==p.RouterController.state.view&&p.RouterController.goBack(),this.caipNetwork=e}prefetch(){this.hasPrefetched||(w.ApiController.prefetch(),w.ApiController.fetchWalletsByPage({page:1}),this.hasPrefetched=!0)}}em.styles=ew,ep([(0,r.Cb)({type:Boolean})],em.prototype,"enableEmbedded",void 0),ep([(0,r.SB)()],em.prototype,"open",void 0),ep([(0,r.SB)()],em.prototype,"caipAddress",void 0),ep([(0,r.SB)()],em.prototype,"caipNetwork",void 0),ep([(0,r.SB)()],em.prototype,"shake",void 0),ep([(0,r.SB)()],em.prototype,"filterByNamespace",void 0);let eh=class extends em{};eh=ep([(0,y.Mo)("w3m-modal")],eh);let ev=class extends em{};ev=ep([(0,y.Mo)("appkit-modal")],ev)}}]);