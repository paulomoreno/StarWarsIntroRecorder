#!/usr/bin/env python
#*-* encoding:utf-8 *-*

import requests
from flask import request, Response

from balancer.app import app


config = app.config


def proxy(auth=True):
    # TODO cycle through some servers and then return the response
    response = requests.get('http://localhost:1977' + request.path, params={
        'code': request.args.get('code', None),
        'email': request.args.get('email', None),
        'auth': config['AUTH'] if auth else request.args.get('auth', None),
    })

    if response.status_code == 200:
        return Response(response.text, mimetype='application/json')
    return Response('something_wrong', 400)


@app.route('/status')
def status():
    return proxy()


@app.route('/request')
def video_request():
    return proxy()


@app.route('/bump')
def bump():
    return proxy(auth=False)


@app.route('/bounce')
def bounce():
    return proxy(auth=False)


@app.route('/queue')
def queue():
    return proxy(auth=False)
