
"""
NOTE: client_secrets.json given by GA will be in same directory as this file
Steps are:
1. Get GA count for now at every 5 seconds.
2. compare count with previous count
3. If current count is greater than previous count then override previous count with current count
4. Save also time of greater count
5. at every 12 hours shoot a mail saying max count for last 12 hours with the time of max count
"""

import argparse
import sys
import json
import datetime
import os
import smtplib
import commands
#import schedule
import time
import logging
from logging.handlers import RotatingFileHandler
import errno
from socket import error as socket_error

from googleapiclient.errors import HttpError
from googleapiclient import sample_tools
#from oauth2client.client import AccessTokenRefreshError

LOG_FILE = 'ga_realtime.log'
logger = logging.getLogger('my_logger')
logger.setLevel(logging.INFO)

    # below maxBytes is equal to 10 MB
handler = RotatingFileHandler(LOG_FILE, maxBytes=10485760, backupCount=5)

formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# send mail at below hours
mailSentHrs = ['02', '20']

#pid = str(os.getpid())
#pidfile = "pid_file_ga_realtime.pid"

#if os.path.isfile(pidfile):
#    print "%s already exists, exiting" % pidfile
#    sys.exit()
#file(pidfile, 'w').write(pid)

#while True:
    #print "Hello World"

def getActiveUsers(results):
  # Print headers.
  output = []

  if results.get('rows', []):
    for row in results.get('rows'):
      output = []
      for cell in row:
        output.append('%30s' % cell)
  else:
    print 'No Results Found'

  activeUsers = ''.join(output)
  return activeUsers.lstrip()

def sendMail(mailText):
  fromaddr = 'abc@gmail.com'
  toaddrs  = 'abc@gmail.com'
  toaddrsArr  = ["abc@gmail.com"]
  username = 'abc@gmail.com'
  password = 'abc'
  server = smtplib.SMTP('outlook.office365.com:587')

  header = 'To:' + ", ".join(toaddrsArr) + '\n' + 'From: ' + fromaddr + '\n' + 'Subject:' + mailText + ' \n'
  #print header
  msg = header + '\n' + mailText + '\n\n'

  server.ehlo()
  server.starttls()
  server.login(username,password)
  server.sendmail(fromaddr, toaddrsArr, msg)
  server.quit()
  logger.info("mail sent done!")

def gaRealtimeJob():
    try:
      gaDate = datetime.datetime.now() + datetime.timedelta(hours=5)
      gaDate = gaDate + datetime.timedelta(minutes=30)
      logger.info(gaDate)

      service, flags = sample_tools.init(
          sys.argv, 'analytics', 'v3', __doc__, __file__,
          scope='https://www.googleapis.com/auth/analytics.readonly')

      result = service.data().realtime().get(
          ids='ga:xxx',
          metrics='rt:activeUsers').execute()

      androidActiveUsers = getActiveUsers(result)

      result = service.data().realtime().get(
          ids='ga:yyy',
          metrics='rt:activeUsers').execute()

      webActiveUsers = getActiveUsers(result)

      logger.info('androidActiveUsers: ' + androidActiveUsers + ", webActiveUsers: " + webActiveUsers)

      jsonData = {}

      with open('dataFile') as json_file:
        jsonData = json.load(json_file)
        for key, value in jsonData[0].iteritems():
          # print key + " " + value
          if key == 'androidActiveUsers':
            oldAndroidActiveUsers = value
          if key == 'webActiveUsers':
            oldWebActiveUsers = value
      logger.info('oldAndroidActiveUsers: ' + oldAndroidActiveUsers + ', oldWebActiveUsers: ' + oldWebActiveUsers)

      # updating data if current count is max than old count
      if int(androidActiveUsers) > int(oldAndroidActiveUsers):
        jsonData[0]['androidActiveUsers'] = androidActiveUsers
        jsonData[0]['androidTime'] = gaDate.strftime ("%d-%m-%Y %H:%M:%S")
      if int(webActiveUsers) > int(oldWebActiveUsers):
        jsonData[0]['webActiveUsers'] = webActiveUsers
        jsonData[0]['webTime'] = gaDate.strftime ("%d-%m-%Y %H:%M:%S")

      currentHour = gaDate.strftime ("%H")
      logger.info(currentHour)

      mailSentFile = 'mailFlag'
      if currentHour in mailSentHrs:
        if not os.path.exists(mailSentFile):
          logger.info("Sending Mail")
          sendMail(json.dumps(jsonData))
          open(mailSentFile, 'w')
          jsonData[0]['androidActiveUsers'] = '0'
          jsonData[0]['androidTime'] = '0'
          jsonData[0]['webActiveUsers'] = '0'
          jsonData[0]['webTime'] = '0'

      else:
        logger.info("not sending mail")
        if os.path.exists(mailSentFile):
          os.remove(mailSentFile)

      # writing updated data to file
      with open('dataFile', 'w') as outfile:
        json.dump(jsonData, outfile)

    except TypeError, error:
      # Handle errors in constructing a query.
      logger.error('There was an error in constructing your query : %s' % error)

    except HttpError, error:
      # Handle API errors.
      logger.error('Arg, there was an API error : %s : %s' %
             (error.resp.status, error._get_reason()))
    except socket_error as serr:
      logger.error('Socket error with error number: %s' % (str(serr.errno)))
    except:
      logger.exception('Exception while fetching GA')
      raise
    #finally:
      #os.unlink(pidfile)

#schedule.every(1).minutes.do(gaRealtimeJob)

def main(argv):

    print "in main"
    while True:
        #schedule.run_pending()
        logger.error("while while")
        gaRealtimeJob()
        time.sleep(20)


if __name__ == '__main__':
  main(sys.argv)
