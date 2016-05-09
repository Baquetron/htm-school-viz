$(function() {

    /* The functions below all rely on these values. */

    // Primitives
    var n = 256;
    var w = 4;
    //var n = 2048;
    //var w = 40;
    var sparsity = w / n;
    var theta = Math.floor(w * (3/4));
    var t = w - theta;
    var bitSize = 8;
    var bitStretch = 2;

    // SDRs
    var nextSdr = SDR.tools.getRandom(n, w);
    var matchSdr = undefined;
    var sdrStack = [];

    // UI elements
    var $stack = $('#sdr-stack');

    var $wSlider = $('#w-slider');
    var $tSlider = $('#t-slider');
    var $thetaSlider = $('#theta-slider');

    var $nDisplay = $('#n-display');
    var $wDisplay = $('#w-display');
    var $tDisplay = $('#t-display');
    var $thetaDisplay = $('#theta-display');
    var $sparsityDisplay = $('#sparsity-display');
    var $falsePosDisplay = $('#false-positive-display');

    var $match = $('#match');
    var $nextSdr = $('#next-sdr');
    var $addBtn = $('#add-btn');
    var $populateBtn = $('#populate-btn');
    var $switchBtn = $('#switch-btn');

    // Can be either 'add' or 'match'.
    var viewMode = 'add';


    // Setters

    function setW(myW) {
        w = myW;
        sparsity = w / n;
        nextSdr = SDR.tools.getRandom(n, w);
    }

    function setTheta(myTheta) {
        theta = myTheta;
    }

    /* UI and Draw functions */

    function drawSliders() {
        $wSlider.slider({
            min: 1, max: n, value: w, step: 1,
            slide: function(event, ui) {
                if (validate(ui.value, theta, t)) {
                    setW(ui.value);
                    drawNextSdr();
                    updateUi();
                } else {
                    event.preventDefault();
                }
            }
        });
        $thetaSlider.slider({
            min: 1, max: w, value: theta, step: 1,
            disabled: true,
            slide: function(event, ui) {
                if (validate(w, ui.value, t)) {
                    setTheta(ui.value);
                    matchStack();
                }
                //drawMatch(ui.value, t, function(err) {
                //    if (err) event.preventDefault();
                //});
            }
        });
        $tSlider.slider({
            min: 0, max: w - theta, value: t, step: 1,
            disabled: true,
            slide: function(event, ui) {
                //drawMatch(theta, ui.value, function(err) {
                //    if (err) event.preventDefault();
                //});
            }
        });
    }

    function drawSdrStack() {
        $stack.html('');
        _.each(sdrStack, function(sdr, i) {
            var sdrId = 'sdr-' + i;
            $stack.prepend('<div id="' + sdrId + '" class="sdr">');
            SDR.draw(sdr, sdrId, {
                spartan: true,
                size: bitSize,
                stretch: bitStretch,
                line: true,
                slide: i == sdrStack.length - 1
            });
        });
    }

    function drawNextSdr() {
        SDR.draw(nextSdr, 'next-sdr', {
            spartan: true,
            size: bitSize,
            stretch: bitStretch,
            line: true,
            slide: true
        });
    }

    function drawMatchSdr() {
        SDR.draw(matchSdr, 'next-sdr', {
            spartan: true,
            size: bitSize,
            stretch: bitStretch,
            line: true,
            slide: true
        });
    }

    function updateUi() {
            $nDisplay.html(n);
            $wDisplay.html(w);
            $tDisplay.html(t);
            $thetaDisplay.html(theta);
            $sparsityDisplay.html(sparsity.toFixed(2));
            //if (viewMode == 'add') updateUiForAdding();
            //else updateUiForMatching();
    }

    function updateUiForSdrMatch(left, $left, right) {
        var matches = SDR.tools.population(SDR.tools.overlap(right, left)) >= theta;
        $left.removeClass('highlight');
        if (matches) {
            $left.addClass('match');
        } else {
            $left.removeClass('match');
            $left.find('rect').each(function() {
                var $rect = $(this);
                var c = $rect.attr('class');
                $rect.attr('class', c.replace('match', ''));
            });
        }
        _.each(SDR.tools.getMatchingBitIndices(left, right), function(i) {
            var $rect = $left.find('[index="' + i +'"]');
            var c = $rect.attr('class');
            $rect.attr('class', c + ' match');
        });
    }


    /* Handler functions */

    function addButtonHandlers() {
        $addBtn.click(function() {
            $addBtn.prop('disabled', true);
            $nextSdr.removeClass('highlight');
            $('#next-sdr-svg').slideUp(100, function() {
                $nextSdr.removeClass('highlight');
                nextSdr = SDR.tools.getRandom(n, w);
                drawNextSdr();
                $addBtn.prop('disabled', false);
            });
            sdrStack.push(nextSdr);
            drawSdrStack();
        });
        $populateBtn.click(function() {
            sdrStack = sdrStack.concat(_.map(_.range(50), function() {
                return SDR.tools.getRandom(n, _.random(w-1, w+1));
            }));
            drawSdrStack();
        });
        $switchBtn.click(function() {
            if (viewMode == 'add') viewMode = 'match';
            else viewMode = 'add';
            switchView();
        });
    }

    function addClickHandlers() {
        $nextSdr.click(function(evt) {
            var $rect = $(evt.target);
            var on = undefined;
            var index = undefined;
            var bit = undefined;
            var newClass = undefined;
            if ($rect.prop('nodeName') == 'rect') {
                on = $rect.attr('class');
                index = parseInt($rect.attr('index'));
                bit = 1;
                newClass = 'on';
                if (on == 'on') {
                    bit = 0;
                    newClass = '';
                }
                $rect.attr('class', newClass);
                if (viewMode == 'add') {
                    nextSdr[index] = bit;
                } else {
                    matchSdr[index] = bit;
                    drawSdrStack();
                    matchStack();
                    drawMatchSdr();
                }
            }
        });
        $stack.click(function(evt) {
            var $sdrSvg = undefined;
            var id = undefined;
            var index = undefined;
            //var matchW = undefined;
            if (viewMode == 'match') {
                $sdrSvg = $(evt.target).parent();
                id = $sdrSvg.attr('id');
                index = parseInt(id.split('-')[1]);
                // The match SDR is a copy of the one clicked.
                matchSdr = sdrStack[index].slice(0);
                //matchW = SDR.tools.population(matchSdr);
                //if (! validate(w, theta, t, matchSdr)) {
                //    theta = Math.floor(matchW * (3/4));
                //    t = Math.floor((matchW - theta) * (1/2));
                //}
                drawSdrStack();
                matchStack();
                $nextSdr.addClass('highlight');
                $sdrSvg.parent().addClass('highlight');
                drawMatchSdr();
            }
        });
    }

    /* Utils */

    function validate(testW, testTheta, testT, testMatch) {
        var matchW;
        var wngood = testW <= n;
        if (testMatch) {
            matchW = SDR.tools.population(testMatch);
            return wngood
                && testTheta <= matchW
                && testT <= (matchW - testTheta);
        } else {
            return wngood;
        }
    }

    function switchView() {
        if (viewMode == 'add') {
            $wSlider.slider('option', 'disabled', false);
            $thetaSlider.slider('option', 'disabled', true);
            $tSlider.slider('option', 'disabled', true);
            $addBtn.prop('disabled', false);
            $populateBtn.prop('disabled', false);
            drawNextSdr();
        } else {
            $switchBtn.prop('disabled', true);
            $wSlider.slider('option', 'disabled', true);
            $thetaSlider.slider('option', 'disabled', false);
            $tSlider.slider('option', 'disabled', false);
            $addBtn.prop('disabled', true);
            $populateBtn.prop('disabled', true);
            $nextSdr.html('');
            $('.btn-group').slideUp();
            $('.buttons hr').slideDown();
        }
    }

    function getUiMatchIndication(sdr, matchSdr) {
        var overlap = SDR.tools.getOverlapScore(sdr, matchSdr);
        var percent = Math.min(Math.floor(overlap / theta * 100), 100);
        var clazz = '';
        if (overlap >= theta) clazz = 'match';
        return '<div class="progress ' + clazz + '">'
            + '<div class="progress-bar" role="progressbar" '
            + 'aria-valuenow="' + percent + '" aria-valuemin="0" aria-valuemax="100" '
            + 'style="width: ' + percent + '%;">' + overlap + '</span></div></div>';
    }

    function reOrderStackByOverlapScore() {
        $stack.append($stack.children('div').detach().sort(function(left, right) {
            var leftOverlap = parseInt($(left).find('.progress-bar').text());
            var rightOverlap = parseInt($(right).find('.progress-bar').text());
            return rightOverlap - leftOverlap;
        }));
    }

    function matchStack() {
        var $nextSdr = $('#next-sdr-svg');
        $stack.find('div.sdr').each(function() {
            var $sdr = $(this);
            var $meta = $sdr.find('.meta');
            var id = parseInt($sdr.attr('id').split('-')[1]);
            var sdr = sdrStack[id];
            $meta.html(getUiMatchIndication(sdr, matchSdr));
            //console.log('Updating sdr bit matches for %s', $sdr.attr('id'));
            updateUiForSdrMatch(sdr, $sdr, matchSdr);
            updateUiForSdrMatch(matchSdr, $nextSdr, sdr);
        });
        reOrderStackByOverlapScore();
    }


    function initializeUi() {
        drawSliders();
        addButtonHandlers();
        addClickHandlers();
        switchView();
        drawNextSdr();
        updateUi();
    }

    initializeUi();

});