# -*- coding: utf-8 -*-
# vi:si:et:sw=4:sts=4:ts=4

## Copyright (C) 2015 Async Open Source
##
## Author(s): Stoq Team <stoq-devel@async.com.br>
##
from flask import Flask
from werkzeug.utils import ImportStringError

app = Flask(__name__)

app.config.from_object('balancer.config.Config')
try:
    app.config.from_object('balancer.localconfig.Config')
except ImportStringError:
    pass
