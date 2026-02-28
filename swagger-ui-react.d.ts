declare module 'swagger-ui-react' {
    import type { ComponentType } from 'react'
    interface SwaggerUIProps {
        url?: string
        spec?: object
        [key: string]: unknown
    }
    const SwaggerUI: ComponentType<SwaggerUIProps>
    export default SwaggerUI
}

declare module 'swagger-ui-react/swagger-ui.css' {
    const href: string
    export default href
}
