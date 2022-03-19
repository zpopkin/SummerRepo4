
var __FD_LANGUAGE = false;
try {

FD.Texts.lang = 2;

FD.Texts.set({
ALERT_CANCEL_FORM:'WARNING:\u00250AYou are about to leave the form. The entries you just entered will be lost.',
ALERT_CLOSE_FORM:'The window cannot be closed automatically.\u00250APlease click the X to close the window manually.',
DATE_FORMAT:'mm/dd/yyyy',
FORCED_LOG_OUT:'Logging out . . .',
CHARACTER_COUNT:'characters',
FILE_IOS_SAFARI:'Unfortunately your browser is not able to select files',
EMPTY_OPTION_SELECT:'-\u003e Make a choice \u003c-'
});

/*
var format = ',.';
Number.setFormat(format);
*/

FD.Texts.create('Format', {
NUMBER:',.'
});
FD.Texts.create('Window', {
TITLE_ALERT:'Warning',
TITLE_CONFIRM:'Confirm',
TITLE_INFO:'Information',
TITLE_STOP:'Warning!',
BUTTON_OK:'Ok',
BUTTON_YES:'Yes',
BUTTON_NO:'No',
BUTTON_CLOSE:'Close',
BUTTON_CANCEL:'Cancel',
BUTTON_STOP:'Stop'
});
FD.Texts.create('Progress', {
TITLE_INIT_FORM:'Initializing . . .',
TITLE_LOAD_DATA:'Requesting data . . .',
TITLE_LOAD_FORM:'Loading form . . .',
TITLE_SUBMIT_FORM:'Processing form entries . . .',
TITLE_SUBMIT_FORM_CONFIRM:'Confirmation screen is being processed . . .',
TITLE_CANCEL_FORM:'No entries saved . . .',
TITLE_SUBMIT_FORM_SUBMITCONFIRM:'Waiting for mouse movement or keypress...',
WAIT:'\u003cstrong\u003eOne moment please\u003c/strong\u003e',
WAIT_CONNECTION:'Connection is being checked...',
CONNECTION_ATTEMPTS:'\u003cbr\u003e\u0028attempt \u0025s of \u0025s\u0025s, \u0025s\u0029',
CONNECTION_LINKS:'\u0025sReturn\u0025s'
});
if (typeof AJAX != 'undefined')
AJAX.Texts.set({ progress: FD.Texts.Progress.get('TITLE_LOAD_DATA') });
FD.Texts.create('Status', {
STATUS_500:'500',
STATUS_503:'503',
STATUS_506:'506',
STATUS_TIMEOUT:'Network error',
MESSAGE_506:'Formdesk is currently being updated. Please try again in a minute.'
});
FD.Texts.create('Help', {
TITLE:'Help',
CLOSE:'Close',
CLICK_HERE:'Click here for help'
});
FD.Texts.create('Error', {
CLIENT_ERROR_INFO:'Error on page.',
CLIENT_ERROR_LINE:'Line: ',
CLIENT_ERROR_MSG:'Description: ',
SCRIPT_ERROR_CALC:'An error was found in one or more calculations.\u00250AThe calculations in error are now blinking.',
SCRIPT_ERROR_DEP:'An error occurred in a dependency at the item on\u00250Aposition: ',
SCRIPT_ERROR_UDS:'There is an error in one of your validation scripts.',
SCRIPT_ERROR_LOOKUP:'Error in lookup at item: ',
SCRIPT_ERROR_VALIDATION:'An error is found in the definition of the validation of the item on position: ',
ERROR_FORM_SUBMIT:'An error occurred before sending the form entries.\u00250AThe form could not be submitted!\u00250A\u00250ADid you attach an existing file?',
ERROR_FORM_CONNECTION:'Could not connect to Formdesk.\u00250APlease, try again later.\u00250A\u00250AError code: \u0025s'
});
FD.Texts.create('Validate', {
FORM_VALIDATING:'Validating form entries . . .',
DEFAULT_MESSAGE:'',
CONTINUE_SAVE:'Do you want to store your entries / modifications anyway?',
BUTTON_ACCEPT:'Accept',
BUTTON_CONTINUE:'Correct later',
BUTTON_CORRECT:'Correct now',
REQUIRED:'The mandatory question has not been answered..',
NUMERIC:'The number you entered is invalid.',
DATE_FORMAT:'Invalide date format.\u003cbr\u003e\u003cbr\u003ePlease enter a date as \u0025s.',
DATE_PAST:'Invalid date\u003cbr\u003e\u003cbr\u003ePlease enter a date in the past.',
DATE_FUTURE:'Invalid date.\u003cbr\u003e\u003cbr\u003ePlease enter a future date.',
DATE_PAST_PRESENT:'Invalid date\u003cbr\u003e\u003cbr\u003eThe date must be today or in the past.',
DATE_FUTURE_PRESENT:'Invalid date.\u003cbr\u003e\u003cbr\u003eThe date must be today or in the future.',
CHARACTER:'You entered an invalid character at position \u0025s. ',
REGEXP:'You entered an invalid character.',
DOT_COM:'You are not allowed to enter a .com, .htm or .html as your folder. Please enter a name, not an URL..',
MIN_VALUE:'Unsufficient options selected\u003cbr\u003e\u003cbr\u003ePlease select at least \u0025s options ',
MAX_VALUE:'Too many options selected\u003cbr\u003e\u003cbr\u003ePlease do not select more than \u0025s option\u0028s\u0029 ',
SELECT_OPTIONS:' options.',
SINGLE_VALUE:'You have left a mandatory check box empty.\u003cbr\u003e\u003cbr\u003eYou must tick this..',
SINGLE_OPTION:'You have left a mandatory check box empty.\u003cbr\u003e\u003cbr\u003eYou must tick this..',
MIN_OPTIONS:'You did not specify any options.',
EMAIL:'Invalid email address \u0028\u0025s\u0029.',
EMAIL_CHARACTER:'You have entered an invalid character at position \u0025s. ',
ALTERNATIVE:'You didn\u0027t explain the alternative.\u003cbr\u003e\u003cbr\u003ePlease fill in this field..',
URL:'The URL you entered is invalid..',
FILE_EXTENSION:'Invalid file type.\u00250AValid file types are:\u00250A\u0025s',
POSTALCODE:'Invalid Postal Code.',
POSTALCODE_US:'Invalid zip code. A valid ZIP code must contain eighter 5 or 9 digits.',
AT_QUESTION:'For the question: ',
INVALID_INPUT:'',
MAXLENGTH:'The maximum number of characters has been exceeded.'
});
FD.Texts.create('Lookup', {
NOTFOUND_MESSAGE:'No data found',
LIMIT_EXCEEDED:'Lookup limit exceeded'
});
FD.Texts.create('Calendar', {
MONTH_NAMES:'January,February,March,April,May,June,July,August,September,October,November,December',
DOW_NAMES:'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
HOUR:'hour',
MINUTES:'minutes',
TIME:'Time',
TODAY:'Today'
});
FD.Texts.create('Stack', {
CALCULATION:'Calculation',
DEPENDENCY:'Dependencies',
LOOKUP:'Lookup',
VALIDATION:'Enhanced validations',
IDENTIFIER:'Identifier',
POSITION:'Position',
TYPES:'Section',
MESSAGE:'Event stack overflow.<br>%s'
});
FD.Texts.create('Uploader', {
FILE_BUTTON:'Choose file...',
FILE_BUTTON_REMOVE:'Remove file',
CANCEL_TEXT:'Abort',
ACCEPT_TITLE:'Specific files',
ERROR_FILENAME_MAXLENGTH:'The maximum length for a file name has been exceeded.',
ERROR_FILESIZE:'The file \u0025s \u0028\u0025s\u0029 is too large.\u00250AThe max. allowed size for the concerning question is \u0025s.',
ERROR_TOTAL_FILESIZE:'The total size of all files is too large. The maximum is \u0025s.\u003cbr\u003e\u003cbr\u003e\u0025s',
ERROR_GENERAL:'An error occured while uploading the file \u0025s \u0028error code \u0025s\u0029. Please reselect the file and try again.'
});

String.log('Frontend Language loaded, lang=' + FD.Texts.lang);

__FD_LANGUAGE = true;

} catch (e) {
FD.Error.Send(e, 'get.asp', 0, 'language script');
}

