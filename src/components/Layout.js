import React from 'react';
import Head from 'next/head';
import _ from 'lodash';

import Header from './Header';
import Footer from './Footer';

export default class Body extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Head>
                    <title>{_.get(this.props, 'page.frontmatter.title', null) && (_.get(this.props, 'page.frontmatter.title', null) + ' - ')}{_.get(this.props, 'data.config.title', null)}</title>
                    <meta charSet="utf-8"/>
                    <meta name="viewport" content="width=device-width, initialScale=1.0" />
                    <meta name="description" content={_.get(this.props, 'page.frontmatter.excerpt', null) || _.get(this.props, 'data.config.description', null)}/>
                    <link href="https://fonts.googleapis.com/css?family=Roboto:400,400i,700,700i&display=swap" rel="stylesheet"/> 
                    {(_.get(this.props, 'page.frontmatter.layout', null) === 'post') && ( 
                    _.get(this.props, 'page.frontmatter.canonical_url', null) && (
                    <link rel="canonical" href={_.get(this.props, 'page.frontmatter.canonical_url', null)}/>
                    )
                    )}
                </Head>
                <div id="page" className={'site style-' + _.get(this.props, 'data.config.layout_style', null) + ' palette-' + _.get(this.props, 'data.config.palette', null)}>
                  <Header {...this.props} />
                  <div id="content" className="site-content">
                    <div className="inner">
                      <main id="main" className="site-main">
                        {this.props.children}
                      </main>
                      <Footer {...this.props} />
                    </div>
                  </div>
                </div>
            </React.Fragment>
        );
    }
}
