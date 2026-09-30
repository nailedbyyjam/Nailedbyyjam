// ======================================================
// @NAILEDBYYJAM
// COMPLETE SCRIPT.JS
// ======================================================


// ======================================================
// SUPABASE CONNECTION
// ======================================================

const SUPABASE_URL =
"https://jqnlyxqzowamvncxugph.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
"sb_publishable_lS3qut0gbN-JSqXYiU0TeA_vMHcSAto";

const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// ======================================================
// BOOKING ELEMENTS
// ======================================================

const bookingForm =
document.getElementById("bookingForm");

const message =
document.getElementById("message");

const totalDisplay =
document.getElementById("total");

const basePriceDisplay =
document.getElementById("basePrice");

const addonTotalDisplay =
document.getElementById("addonTotal");

const dateInput =
document.getElementById("date");

const timeInput =
document.getElementById("time");

const nailLengthInput =
document.getElementById("nailLength");


// ======================================================
// VARIABLES
// ======================================================

let blockedDates = [];

let bookedTimes = [];

let currentCustomerBooking = null;


// ======================================================
// APPOINTMENT TIMES
// ======================================================

const appointmentTimes = [

    {
        value: "09:00:00",
        label: "9:00 AM"
    },

    {
        value: "10:00:00",
        label: "10:00 AM"
    },

    {
        value: "11:00:00",
        label: "11:00 AM"
    },

    {
        value: "12:00:00",
        label: "12:00 PM"
    },

    {
        value: "13:00:00",
        label: "1:00 PM"
    },

    {
        value: "14:00:00",
        label: "2:00 PM"
    },

    {
        value: "15:00:00",
        label: "3:00 PM"
    },

    {
        value: "16:00:00",
        label: "4:00 PM"
    },

    {
        value: "17:00:00",
        label: "5:00 PM"
    },

    {
        value: "18:00:00",
        label: "6:00 PM"
    },

    {
        value: "19:00:00",
        label: "7:00 PM"
    }

];


// ======================================================
// NAIL PRICES
// ======================================================

const nailPrices = {

    Short: 50,

    Medium: 55,

    Long: 60,

    XL: 65

};


// ======================================================
// CALCULATE TOTAL
// ======================================================

function calculateTotal() {

    if (!nailLengthInput) {
        return 0;
    }

    const nailLength =
        nailLengthInput.value;

    const basePrice =
        nailPrices[nailLength] || 0;

    const selectedDesigns =
        document.querySelectorAll(
            'input[name="design"]:checked'
        );

    let addonTotal = 0;

    selectedDesigns.forEach(
        function(design) {

            addonTotal +=
                Number(
                    design.dataset.price
                ) || 0;

        }
    );

    const total =
        basePrice + addonTotal;


    if (basePriceDisplay) {

        basePriceDisplay.textContent =
            "$" +
            basePrice.toFixed(2);

    }


    if (addonTotalDisplay) {

        addonTotalDisplay.textContent =
            "$" +
            addonTotal.toFixed(2);

    }


    if (totalDisplay) {

        totalDisplay.textContent =
            "$" +
            total.toFixed(2);

    }


    return total;

}


// ======================================================
// PRICE EVENTS
// ======================================================

if (nailLengthInput) {

    nailLengthInput.addEventListener(
        "change",
        calculateTotal
    );

}


document
.querySelectorAll(
    'input[name="design"]'
)
.forEach(
    function(checkbox) {

        checkbox.addEventListener(
            "change",
            calculateTotal
        );

    }
);


// ======================================================
// LOAD BLOCKED DATES
// ======================================================

async function loadBlockedDates() {

    const result =
        await supabaseClient
        .from("blocked_dates")
        .select("date");


    if (result.error) {

        console.error(
            "Blocked date error:",
            result.error
        );

        return;

    }


    blockedDates =
        (result.data || [])
        .map(
            function(item) {

                return item.date;

            }
        );

}


// ======================================================
// CHECK BLOCKED DATE
// ======================================================

function isDateBlocked(date) {

    return blockedDates.includes(date);

}


// ======================================================
// NORMALIZE TIME
// ======================================================

function normalizeTime(time) {

    if (!time) {

        return "";

    }


    const parts =
        String(time).split(":");


    if (parts.length < 2) {

        return time;

    }


    const hour =
        String(
            parseInt(
                parts[0],
                10
            )
        ).padStart(2, "0");


    const minutes =
        String(parts[1])
        .padStart(2, "0");


    return (
        hour +
        ":" +
        minutes +
        ":00"
    );

}


// ======================================================
// LOAD BOOKED TIMES
// ======================================================

async function loadBookedTimes(date) {

    bookedTimes = [];


    if (!date) {

        resetTimeOptions();

        return;

    }


    if (isDateBlocked(date)) {

        disableAllTimes();

        return;

    }


    timeInput.innerHTML = "";


    const loading =
        document.createElement("option");


    loading.value = "";

    loading.textContent =
        "Checking availability...";

    loading.disabled = true;

    loading.selected = true;


    timeInput.appendChild(
        loading
    );


    const result =
        await supabaseClient
        .from("bookings")
        .select("time,status")
        .eq("date", date);


    if (result.error) {

        console.error(
            "Availability error:",
            result.error
        );


        resetTimeOptions();

        message.textContent =
            "Could not check appointment availability.";

        message.className =
            "error";

        return;

    }


    bookedTimes =
        (result.data || [])
        .filter(
            function(booking) {

                return (
                    booking.status !==
                    "Cancelled"
                );

            }
        )
        .map(
            function(booking) {

                return normalizeTime(
                    booking.time
                );

            }
        );


    renderTimeOptions();


    const availableCount =
        appointmentTimes.filter(
            function(time) {

                return !bookedTimes.includes(
                    time.value
                );

            }
        ).length;


    if (availableCount === 0) {

        message.textContent =
            "No appointment times are available on this date. Please choose another date. 💗";

        message.className =
            "error";

    }

    else {

        message.textContent =
            availableCount +
            " appointment time" +
            (
                availableCount === 1
                    ? ""
                    : "s"
            ) +
            " available. 💗";

        message.className =
            "success";

    }

}


// ======================================================
// RENDER TIMES
// ======================================================

function renderTimeOptions() {

    timeInput.innerHTML = "";


    const defaultOption =
        document.createElement("option");


    defaultOption.value = "";

    defaultOption.textContent =
        "Select a time";

    defaultOption.selected = true;


    timeInput.appendChild(
        defaultOption
    );


    appointmentTimes.forEach(
        function(time) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                time.value;


            if (
                bookedTimes.includes(
                    time.value
                )
            ) {

                option.textContent =
                    time.label +
                    " — BOOKED";

                option.disabled =
                    true;

            }

            else {

                option.textContent =
                    time.label +
                    " — Available";

            }


            timeInput.appendChild(
                option
            );

        }
    );

}


// ======================================================
// RESET TIMES
// ======================================================

function resetTimeOptions() {

    timeInput.innerHTML = "";


    const option =
        document.createElement("option");


    option.value = "";

    option.textContent =
        "Select a date first";

    option.selected = true;


    timeInput.appendChild(
        option
    );

}


// ======================================================
// DISABLE ALL TIMES
// ======================================================

function disableAllTimes() {

    timeInput.innerHTML = "";


    const first =
        document.createElement("option");


    first.value = "";

    first.textContent =
        "Date unavailable";

    first.disabled = true;

    first.selected = true;


    timeInput.appendChild(
        first
    );


    appointmentTimes.forEach(
        function(time) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                time.value;


            option.textContent =
                time.label +
                " — Unavailable";


            option.disabled =
                true;


            timeInput.appendChild(
                option
            );

        }
    );

}


// ======================================================
// DATE CHANGE
// ======================================================

if (dateInput) {

    dateInput.addEventListener(
        "change",
        async function() {

            const date =
                dateInput.value;


            message.textContent = "";

            message.className = "";


            if (!date) {

                resetTimeOptions();

                return;

            }


            if (isDateBlocked(date)) {

                message.textContent =
                    "This date is unavailable. Please choose another date. 💗";

                message.className =
                    "error";


                disableAllTimes();

                return;

            }


            await loadBookedTimes(
                date
            );

        }
    );

}


// ======================================================
// TIME CHANGE
// ======================================================

if (timeInput) {

    timeInput.addEventListener(
        "change",
        function() {

            const selectedTime =
                timeInput.value;


            if (
                bookedTimes.includes(
                    normalizeTime(
                        selectedTime
                    )
                )
            ) {

                message.textContent =
                    "That time is already booked.";

                message.className =
                    "error";


                timeInput.value = "";

                return;

            }


            message.textContent = "";

            message.className = "";

        }
    );

}


// ======================================================
// MIN DATE
// ======================================================

if (dateInput) {

    const today =
        new Date()
        .toISOString()
        .split("T")[0];


    dateInput.min =
        today;

}


// ======================================================
// FINAL TIME CHECK
// ======================================================

async function checkTimeAvailability(
    date,
    time
) {

    if (isDateBlocked(date)) {

        return {

            available: false,

            reason:
                "This date is unavailable."

        };

    }


    const result =
        await supabaseClient
        .from("bookings")
        .select("id,status")
        .eq("date", date)
        .eq("time", time);


    if (result.error) {

        return {

            available: false,

            reason:
                "Could not verify availability."

        };

    }


    const activeBookings =
        (result.data || [])
        .filter(
            function(booking) {

                return (
                    booking.status !==
                    "Cancelled"
                );

            }
        );


    if (
        activeBookings.length > 0
    ) {

        return {

            available: false,

            reason:
                "That appointment time was just booked. Please choose another time."

        };

    }


    return {

        available: true,

        reason: ""

    };

}


// ======================================================
// SUBMIT BOOKING
// ======================================================

if (bookingForm) {

    bookingForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const name =
                document
                .getElementById("name")
                .value
                .trim();


            const email =
                document
                .getElementById("email")
                .value
                .trim()
                .toLowerCase();


            const phone =
                document
                .getElementById("phone")
                .value
                .trim();


            const instagram =
                document
                .getElementById("instagram")
                .value
                .trim();


            const date =
                dateInput.value;


            const time =
                timeInput.value;


            const nailLength =
                nailLengthInput.value;


            const inspiration =
                document
                .getElementById("inspiration")
                .value
                .trim();


            if (!date) {

                message.textContent =
                    "Please select a date.";

                message.className =
                    "error";

                return;

            }


            if (isDateBlocked(date)) {

                message.textContent =
                    "This date is unavailable.";

                message.className =
                    "error";

                return;

            }


            if (!time) {

                message.textContent =
                    "Please select an available time.";

                message.className =
                    "error";

                return;

            }


            const availability =
                await checkTimeAvailability(
                    date,
                    time
                );


            if (
                !availability.available
            ) {

                message.textContent =
                    availability.reason;

                message.className =
                    "error";


                await loadBookedTimes(
                    date
                );

                return;

            }


            if (!nailLength) {

                message.textContent =
                    "Please select a nail length.";

                message.className =
                    "error";

                return;

            }


            const selectedDesigns =
                Array.from(
                    document.querySelectorAll(
                        'input[name="design"]:checked'
                    )
                )
                .map(
                    function(design) {

                        return design.value;

                    }
                );


            const total =
                calculateTotal();


            message.textContent =
                "Submitting your booking...";

            message.className =
                "loading";


            const booking = {

                name: name,

                email: email,

                phone: phone,

                date: date,

                time: time,

                nail_length:
                    nailLength,

                designs:
                    selectedDesigns.length
                        ? selectedDesigns.join(
                            ", "
                        )
                        : "None",

                instagram:
                    instagram,

                inspiration:
                    inspiration,

                total:
                    total,

                status:
                    "Pending Deposit"

            };


            const result =
                await supabaseClient
                .from("bookings")
                .insert([
                    booking
                ]);


            if (result.error) {

                console.error(
                    "Booking error:",
                    result.error
                );


                message.textContent =
                    "Something went wrong: " +
                    result.error.message;

                message.className =
                    "error";

                return;

            }


            message.textContent =
                "Booking submitted! 💗 Sending confirmation...";

            message.className =
                "loading";


            try {

                const emailResponse =
                    await supabaseClient.functions.invoke(
                        "send-booking-email",
                        {
                            body:
                                booking
                        }
                    );


                if (
                    emailResponse.error
                ) {

                    message.textContent =
                        "Booking submitted! 💗 Please send the $15 deposit to $Jamiiamariee1 to secure your appointment.";

                }

                else {

                    message.textContent =
                        "Booking submitted! 💗 A confirmation email has been sent. Please send the $15 deposit to $Jamiiamariee1 to secure your appointment.";

                }


                message.className =
                    "success";

            }

            catch (error) {

                console.error(
                    error
                );


                message.textContent =
                    "Booking submitted! 💗 Please send the $15 deposit to $Jamiiamariee1 to secure your appointment.";

                message.className =
                    "success";

            }


            bookingForm.reset();


            basePriceDisplay.textContent =
                "$0.00";


            addonTotalDisplay.textContent =
                "$0.00";


            totalDisplay.textContent =
                "$0.00";


            resetTimeOptions();


            bookedTimes = [];

        }
    );

}


// ======================================================
// CUSTOMER APPOINTMENT MANAGEMENT
// ======================================================


// ======================================================
// FIND CUSTOMER APPOINTMENT
// ======================================================

async function findMyAppointment() {

    const email =
        document
        .getElementById("manageEmail")
        .value
        .trim()
        .toLowerCase();


    const date =
        document
        .getElementById("manageDate")
        .value;


    const manageMessage =
        document.getElementById(
            "manageMessage"
        );


    const resultDiv =
        document.getElementById(
            "appointmentResult"
        );


    manageMessage.textContent = "";

    manageMessage.className = "";

    resultDiv.innerHTML = "";


    if (!email || !date) {

        manageMessage.textContent =
            "Please enter your email and appointment date.";

        manageMessage.className =
            "error";

        return;

    }


    manageMessage.textContent =
        "Looking for your appointment...";

    manageMessage.className =
        "loading";


    try {

        const result =
            await supabaseClient.rpc(
                "find_customer_booking",
                {
                    customer_email:
                        email,

                    appointment_date:
                        date
                }
            );


        if (result.error) {

            console.error(
                "Find appointment error:",
                result.error
            );


            manageMessage.textContent =
                "Could not find your appointment. Please try again.";

            manageMessage.className =
                "error";

            return;

        }


        if (
            !result.data ||
            result.data.length === 0
        ) {

            manageMessage.textContent =
                "No active appointment was found with that email and date.";

            manageMessage.className =
                "error";

            return;

        }


        currentCustomerBooking =
            result.data[0];


        manageMessage.textContent =
            "Appointment found! 💗";

        manageMessage.className =
            "success";


        renderCustomerAppointment(
            currentCustomerBooking
        );

    }

    catch (error) {

        console.error(
            error
        );


        manageMessage.textContent =
            "Something went wrong. Please try again.";

        manageMessage.className =
            "error";

    }

}


// ======================================================
// RENDER CUSTOMER APPOINTMENT
// ======================================================

function renderCustomerAppointment(
    booking
) {

    const resultDiv =
        document.getElementById(
            "appointmentResult"
        );


    const formattedDate =
        formatCustomerDate(
            booking.date
        );


    const formattedTime =
        formatCustomerTime(
            booking.time
        );


    resultDiv.innerHTML = `

        <div class="appointment-card">

            <h3>
                Your Appointment
            </h3>


            <span class="appointment-status ${
                booking.status === "Confirmed"
                    ? "confirmed"
                    : ""
            }">

                ${escapeHTML(
                    booking.status
                )}

            </span>


            <p>
                <strong>Name:</strong>
                ${escapeHTML(
                    booking.name
                )}
            </p>


            <p>
                <strong>Date:</strong>
                ${formattedDate}
            </p>


            <p>
                <strong>Time:</strong>
                ${formattedTime}
            </p>


            <p>
                <strong>Nail Length:</strong>
                ${escapeHTML(
                    booking.nail_length ||
                    "Not provided"
                )}
            </p>


            <p>
                <strong>Total:</strong>
                $${Number(
                    booking.total || 0
                ).toFixed(2)}
            </p>


            <div class="manage-actions">

                <button
                    type="button"
                    class="btn reschedule-appointment-button"
                    onclick="showRescheduleArea()"
                >
                    📅 Reschedule
                </button>


                <button
                    type="button"
                    class="btn cancel-appointment-button"
                    onclick="cancelCustomerAppointment()"
                >
                    ❌ Cancel Appointment
                </button>

            </div>

        </div>

    `;

}


// ======================================================
// SHOW RESCHEDULE AREA
// ======================================================

function showRescheduleArea() {

    if (!currentCustomerBooking) {

        return;

    }


    const area =
        document.getElementById(
            "rescheduleArea"
        );


    area.style.display =
        "block";


    const today =
        new Date()
        .toISOString()
        .split("T")[0];


    document.getElementById(
        "newDate"
    ).min =
        today;


    area.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


// ======================================================
// LOAD NEW RESCHEDULE TIMES
// ======================================================

const newDateElement =
document.getElementById(
    "newDate"
);


if (newDateElement) {

    newDateElement.addEventListener(
        "change",
        async function() {

            const newDate =
                this.value;


            const newTime =
                document.getElementById(
                    "newTime"
                );


            if (!newDate) {

                newTime.innerHTML = `
                    <option value="">
                        Select a date first
                    </option>
                `;

                return;

            }


            if (
                isDateBlocked(
                    newDate
                )
            ) {

                newTime.innerHTML = `
                    <option value="">
                        Date unavailable
                    </option>
                `;

                return;

            }


            newTime.innerHTML = `
                <option value="">
                    Checking availability...
                </option>
            `;


            /*
             * Check bookings for the new date.
             *
             * This requires your Supabase RLS
             * to allow the availability query.
             */

            const result =
                await supabaseClient
                .from("bookings")
                .select(
                    "id,time,status"
                )
                .eq(
                    "date",
                    newDate
                );


            if (result.error) {

                console.error(
                    "Reschedule availability error:",
                    result.error
                );


                newTime.innerHTML = `
                    <option value="">
                        Could not check availability
                    </option>
                `;

                return;

            }


            const unavailableTimes =
                (result.data || [])
                .filter(
                    function(booking) {

                        return (

                            booking.status !==
                            "Cancelled"

                            &&

                            String(
                                booking.id
                            ) !==
                            String(
                                currentCustomerBooking.id
                            )

                        );

                    }
                )
                .map(
                    function(booking) {

                        return normalizeTime(
                            booking.time
                        );

                    }
                );


            newTime.innerHTML = `
                <option value="">
                    Select a new time
                </option>
            `;


            appointmentTimes.forEach(
                function(time) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        time.value;


                    if (
                        unavailableTimes.includes(
                            time.value
                        )
                    ) {

                        option.textContent =
                            time.label +
                            " — BOOKED";

                        option.disabled =
                            true;

                    }

                    else {

                        option.textContent =
                            time.label +
                            " — Available";

                    }


                    newTime.appendChild(
                        option
                    );

                }
            );

        }
    );

}


// ======================================================
// RESCHEDULE APPOINTMENT
// ======================================================

async function rescheduleAppointment() {

    if (!currentCustomerBooking) {

        return;

    }


    const newDate =
        document
        .getElementById("newDate")
        .value;


    const newTime =
        document
        .getElementById("newTime")
        .value;


    const manageMessage =
        document.getElementById(
            "manageMessage"
        );


    if (!newDate || !newTime) {

        manageMessage.textContent =
            "Please choose a new date and time.";

        manageMessage.className =
            "error";

        return;

    }


    if (
        isDateBlocked(
            newDate
        )
    ) {

        manageMessage.textContent =
            "That date is unavailable.";

        manageMessage.className =
            "error";

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to reschedule your appointment to " +
            formatCustomerDate(newDate) +
            " at " +
            formatCustomerTime(newTime) +
            "?"
        );


    if (!confirmed) {

        return;

    }


    manageMessage.textContent =
        "Rescheduling appointment...";

    manageMessage.className =
        "loading";


    try {

        const result =
            await supabaseClient.rpc(
                "reschedule_customer_booking",
                {
                    booking_id:
                        currentCustomerBooking.id,

                    new_date:
                        newDate,

                    new_time:
                        newTime
                }
            );


        if (result.error) {

            console.error(
                "Reschedule error:",
                result.error
            );


            manageMessage.textContent =
                result.error.message ||
                "Could not reschedule your appointment.";

            manageMessage.className =
                "error";

            return;

        }


        /*
         * SECURITY DEFINER function returns
         * one booking row.
         */

        if (!result.data) {

            manageMessage.textContent =
                "Could not reschedule your appointment.";

            manageMessage.className =
                "error";

            return;

        }


        currentCustomerBooking =
            Array.isArray(
                result.data
            )
            ? result.data[0]
            : result.data;


        document.getElementById(
            "rescheduleArea"
        ).style.display =
            "none";


        manageMessage.textContent =
            "Appointment successfully rescheduled! 💗";

        manageMessage.className =
            "success";


        renderCustomerAppointment(
            currentCustomerBooking
        );


        // Send reschedule email

        try {

            await supabaseClient.functions.invoke(
                "send-status-email",
                {
                    body: {

                        name:
                            currentCustomerBooking.name,

                        email:
                            currentCustomerBooking.email,

                        status:
                            "Rescheduled",

                        date:
                            currentCustomerBooking.date,

                        time:
                            currentCustomerBooking.time

                    }
                }
            );

        }

        catch (emailError) {

            console.error(
                "Reschedule email error:",
                emailError
            );

        }

    }

    catch (error) {

        console.error(
            "Reschedule error:",
            error
        );


        manageMessage.textContent =
            "Something went wrong while rescheduling.";

        manageMessage.className =
            "error";

    }

}


// ======================================================
// CANCEL CUSTOMER APPOINTMENT
// ======================================================

async function cancelCustomerAppointment() {

    if (!currentCustomerBooking) {

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to cancel your appointment?\n\n" +
            "This cannot be undone from the customer side."
        );


    if (!confirmed) {

        return;

    }


    const manageMessage =
        document.getElementById(
            "manageMessage"
        );


    manageMessage.textContent =
        "Cancelling appointment...";

    manageMessage.className =
        "loading";


    try {

        const result =
            await supabaseClient.rpc(
                "cancel_customer_booking",
                {
                    booking_id:
                        currentCustomerBooking.id
                }
            );


        if (result.error) {

            console.error(
                "Cancel appointment error:",
                result.error
            );


            manageMessage.textContent =
                result.error.message ||
                "Could not cancel your appointment.";

            manageMessage.className =
                "error";

            return;

        }


        if (!result.data) {

            manageMessage.textContent =
                "Could not cancel your appointment.";

            manageMessage.className =
                "error";

            return;

        }


        currentCustomerBooking =
            Array.isArray(
                result.data
            )
            ? result.data[0]
            : result.data;


        document.getElementById(
            "appointmentResult"
        ).innerHTML = `

            <div class="appointment-card">

                <h3>
                    Appointment Cancelled
                </h3>


                <span class="appointment-status cancelled">
                    Cancelled
                </span>


                <p>
                    Your appointment has been cancelled.
                </p>


                <p>
                    The appointment time is now available
                    for someone else to book.
                </p>

            </div>

        `;


        document.getElementById(
            "rescheduleArea"
        ).style.display =
            "none";


        manageMessage.textContent =
            "Your appointment has been cancelled successfully. 💗";

        manageMessage.className =
            "success";


        // Send cancellation email

        try {

            await supabaseClient.functions.invoke(
                "send-status-email",
                {
                    body: {

                        name:
                            currentCustomerBooking.name,

                        email:
                            currentCustomerBooking.email,

                        status:
                            "Cancelled",

                        date:
                            currentCustomerBooking.date,

                        time:
                            currentCustomerBooking.time

                    }
                }
            );

        }

        catch (emailError) {

            console.error(
                "Cancellation email error:",
                emailError
            );

        }

    }

    catch (error) {

        console.error(
            "Cancellation error:",
            error
        );


        manageMessage.textContent =
            "Something went wrong while cancelling.";

        manageMessage.className =
            "error";

    }

}


// ======================================================
// FORMAT CUSTOMER DATE
// ======================================================

function formatCustomerDate(
    date
) {

    if (!date) {

        return "Not provided";

    }


    const parts =
        String(date).split("-");


    if (
        parts.length !== 3
    ) {

        return date;

    }


    return (
        parts[1] +
        "/" +
        parts[2] +
        "/" +
        parts[0]
    );

}


// ======================================================
// FORMAT CUSTOMER TIME
// ======================================================

function formatCustomerTime(
    time
) {

    if (!time) {

        return "Not provided";

    }


    const parts =
        String(time).split(":");


    let hour =
        parseInt(
            parts[0],
            10
        );


    const minutes =
        parts[1] ||
        "00";


    const ampm =
        hour >= 12
            ? "PM"
            : "AM";


    hour =
        hour % 12 ||
        12;


    return (
        hour +
        ":" +
        minutes +
        " " +
        ampm
    );

}


// ======================================================
// HTML SECURITY
// ======================================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ======================================================
// INITIAL LOAD
// ======================================================

loadBlockedDates();

resetTimeOptions();

calculateTotal();
