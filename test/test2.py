from apiclient import errors
from apiclient.discovery import build
from oauth2client.client import OAuth2WebServerFlow
import httplib2
import json

# easy access to account/view/property when using multiple accounts (e.g., ios app, android app, website) 
with open('client_secrets.json') as p:
    gc = json.load(p)
    p.close()

# get this from your google developers console...it assumes you've already authorized the analytics api/etc
with open('client_secrets.json') as p:
    o = json.load(p)
    p.close()

# must set the scope to use a particular service
# https://developers.google.com/analytics/devguides/reporting/realtime/v3/reference/data/realtime/get#auth
ga_real_scope = 'https://www.googleapis.com/auth/analytics.readonly'

# run through the OAuth flow and retrieve credentials
# very clear example of how to auth i found here: https://developers.google.com/webmaster-tools/v3/quickstart/quickstart-python
flow = OAuth2WebServerFlow(o['installed']['client_id'], o['installed']['client_secret'], ga_real_scope, o['installed']['redirect_uris'][0])
authorize_url = flow.step1_get_authorize_url()
print 'Go to the following link in your browser: {0}'.format(authorize_url)
code = raw_input('Enter verification code: ').strip()
credentials = flow.step2_exchange(code)

# create an httplib2.Http object and authorize it with our credentials
http = httplib2.Http()
http = credentials.authorize(http)

service = build('analytics', 'v3', http=http)

active_users = service.data().realtime().get(
      ids='ga:' + gc['188956973']['view'],
      metrics='rt:activeUsers',
dimensions='rt:medium').execute()