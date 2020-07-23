import Document, { Html, Head, Main, NextScript } from 'next/document';
import ScriptTag from 'react-script-tag';
import { withPrefix } from '../utils';


class MyDocument extends Document {

    static async getInitialProps(ctx) {
        const initialProps = await Document.getInitialProps(ctx);
        return { ...initialProps }
    }

    render() {
        return (
            <Html>
                <Head />
                <body>
                    <Main />
                    <NextScript />
                    <ScriptTag src={withPrefix('assets/js/plugins.js')}/>
                    <ScriptTag src={withPrefix('assets/js/main.js')}/>
                </body>
            </Html>
        );
    }
}

export default MyDocument;
