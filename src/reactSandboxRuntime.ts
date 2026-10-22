import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import * as JSXRuntime from 'react/jsx-runtime'
import * as Motion from 'framer-motion'
import * as Icons from 'lucide-react'
import * as LiquidGooey from 'liquid-gooey'

Object.assign(globalThis, {
  MotionWorkbenchReact: { React, ReactDOMClient, JSXRuntime, Motion, Icons, LiquidGooey },
})
