"use strict";

$(document).ready(function() {

	function formatIsk(n) {
		var c = 0,
			d = ".",
			t = ",",
			s = n < 0 ? "-" : "",
			i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
			j = (j = i.length) > 3 ? j % 3 : 0;
		return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	};

	function roundUpThousand(n) {
		return Math.ceil(n / 1000) * 1000;
	}

	function parseText(input, errors) {
		var ret = [];
		var splitted = input.split("\n");
		for (let line of splitted) {
			if (line) {
				var parts = line.trim().split("\t");
				var typename = parts[0].trim();
				var qt = parseInt(parts[1]);
				if (isNaN(qt)) {
					qt = 1;
				}
				ret.push({"typename":typename,"quantity":qt});
			}
		}
		return ret;
	}

	var market = null;
	var overrides = null;

	$('#pastearea').attr("disabled", true);
	$('#appraise').attr("disabled", true);
	$('#paste-area').val("loading price data...");

	$.getJSON('/jita-buy', function(result) {
		market = result;
		if (!market || !overrides) {
			$('#paste-area').val('');
			$("#paste-area").attr("disabled", false);
			$("#appraise").attr("disabled", false);
		}
	});

	$.getJSON('/overrides.json', function(result) {
		overrides = result;
		if (!market || !overrides) {
			$('#paste-area').val('');
			$("#paste-area").attr("disabled", false);
			$("#appraise").attr("disabled", false);
		}
	});

	$('#appraise').click(function() {
		$("#paste-area").attr("disabled", true);
		$("#appraise").attr("disabled", true);

		var errors = [];

		// tally fixed value items separately
		var variableTotal = 0;
		var fixedTotal = 0;

		var items = parseText($('#paste-area').val(), errors);
		console.log(items.length);
		for (let line of items) {
			var typename = line.typename;
			var qt = line.quantity;
			var found = false;

			// see if there is a fixed value override
			for (let item of overrides.fixed) {
				if (item.typename === typename) {
					//console.log(item.typename + " (" + qt + ") [" + item.value + "]");
					fixedTotal += qt * parseFloat(item.value);
					found = true;
					break;
				}
			}
			if (found) {
				// fixed value items are tallied in the loop
				// skip checking for anything else
				continue;
			}
			
			var fitem = null;
			// see if there is a buy value override
			for (let item of overrides.buy) {
				if (item.typename === typename) {
					fitem = item;
					found = true;
					break;
				}
			}
			// otherwise locate the item in the market price list
			if (!found) {
				for (let item of market) {
					if (item.typename === typename) {
						fitem = item;
						found = true;
						break;
					}
				}
			}

			if (found) {
				//console.log(fitem.typename + " (" + qt + ") [" + fitem.value + "]");
				variableTotal += qt * parseFloat(fitem.value);
			} else {
				errors.push("Failed to price \"" + typename + "\"");
				//console.error("Failed to price \"" + typename + "\"");
			}
		}

		var grandTotal_100 = roundUpThousand(variableTotal + fixedTotal);
		var grandTotalPrime = roundUpThousand(0.95 * variableTotal + fixedTotal);
		var grandTotalSub = roundUpThousand(0.90 * variableTotal + fixedTotal);

		$('#appraisal-estimate-prime').html("&#x01B6; " + formatIsk(grandTotalPrime));
		$('#appraisal-estimate-sub').html("&#x01B6; " + formatIsk(grandTotalSub));

		if (errors.length != 0) {
			$('#modal-title').text("Parse Error(s)");
			$('#modal-text').text("Failed to parse one or more lines");
			$('#warning-modal').modal('show');
			
			console.error(errors);
		}

		$('#paste-area').attr("disabled", false);
		$('#appraise').attr("disabled", false);
	});

});
